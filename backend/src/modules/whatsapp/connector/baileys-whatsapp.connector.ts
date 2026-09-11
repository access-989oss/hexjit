import makeWASocket, {
  Browsers,
  DisconnectReason,
  fetchLatestWaWebVersion,
  type WASocket,
  type AuthenticationCreds,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import { prisma } from "../../../lib/prisma.js";
import { BaileysAuthStateStore } from "./baileys-auth-state.store.js";
import { WhatsAppConnectorError } from "./whatsapp-connector.error.js";
import type {
  CreateQrSessionInput,
  WhatsAppAccountInfo,
  WhatsAppConnectionStatus,
  WhatsAppConnector,
  WhatsAppConnectorStatus,
  WhatsAppQrSession,
} from "./whatsapp-connector.types.js";
import { processInboundMessage } from "../runtime/index.js";

type RuntimeSession = {
  accountId: string;
  sessionId: string;
  socket: WASocket;
  status: WhatsAppConnectionStatus;
  qrCode?: string | null;
  qrExpiresAt?: Date | null;
  qrTimer?: NodeJS.Timeout;
  reconnectTimer?: NodeJS.Timeout;
  reconnectAttempts: number;
};

const sessions = new Map<string, RuntimeSession>();

function normalizeBaileysNumber(jid?: string | null): string | undefined {
  if (!jid) {
    return undefined;
  }

  const bare = jid.split(":")[0].split("@")[0];

  if (!bare || !/^\d+$/.test(bare)) {
    return undefined;
  }

  return bare;
}

function normalizeBaileysMessage(message: any, accountId: string) {
  const key = message?.key;
  const remoteJid = key?.remoteJid as string | undefined;
  const participant =
    key?.participant as string | undefined;

  const fromJid =
    remoteJid?.endsWith("@g.us")
      ? participant ?? remoteJid
      : remoteJid;

  const fromNumber =
    normalizeBaileysNumber(fromJid);

  const toNumber =
    normalizeBaileysNumber(key?.participantAlt) ??
    undefined;

  const content =
    message?.message ?? {};

  let type:
    | "text"
    | "image"
    | "audio"
    | "video"
    | "document"
    | "sticker"
    | "location"
    | "reaction"
    | "unknown" = "unknown";

  let text: string | undefined;
  let caption: string | undefined;
  let mimeType: string | undefined;
  let fileName: string | undefined;
  let latitude: number | undefined;
  let longitude: number | undefined;

  if (content.conversation) {
    type = "text";
    text = content.conversation;
  } else if (content.extendedTextMessage) {
    type = "text";
    text =
      content.extendedTextMessage.text ??
      undefined;
  } else if (content.imageMessage) {
    type = "image";
    caption =
      content.imageMessage.caption ??
      undefined;
    text = caption;
    mimeType =
      content.imageMessage.mimetype ??
      undefined;
  } else if (content.audioMessage) {
    type = "audio";
    mimeType =
      content.audioMessage.mimetype ??
      undefined;
  } else if (content.videoMessage) {
    type = "video";
    caption =
      content.videoMessage.caption ??
      undefined;
    text = caption;
    mimeType =
      content.videoMessage.mimetype ??
      undefined;
  } else if (content.documentMessage) {
    type = "document";
    text =
      content.documentMessage.caption ??
      undefined;
    mimeType =
      content.documentMessage.mimetype ??
      undefined;
    fileName =
      content.documentMessage.fileName ??
      undefined;
  } else if (content.stickerMessage) {
    type = "sticker";
    mimeType =
      content.stickerMessage.mimetype ??
      undefined;
  } else if (content.locationMessage) {
    type = "location";
    latitude =
      typeof content.locationMessage.degreesLatitude === "number"
        ? content.locationMessage.degreesLatitude
        : undefined;
    longitude =
      typeof content.locationMessage.degreesLongitude === "number"
        ? content.locationMessage.degreesLongitude
        : undefined;
  } else if (content.reactionMessage) {
    type = "reaction";
    text =
      content.reactionMessage.text ??
      undefined;
  }

  return {
    externalMessageId:
      String(key?.id ?? ""),
    accountId,
    fromNumber,
    toNumber,
    type,
    text,
    mimeType,
    fileName,
    latitude,
    longitude,
    caption,
    timestamp:
      message?.messageTimestamp != null
        ? String(message.messageTimestamp)
        : undefined,
    raw: message,
  };
}

const startingAccounts = new Set<string>();

function cleanupRuntimeSession(
  accountId: string,
): void {
  const runtime = sessions.get(accountId);

  if (!runtime) {
    return;
  }

  clearTimeout(runtime.qrTimer);
  clearTimeout(runtime.reconnectTimer);

  runtime.qrTimer = undefined;
  runtime.reconnectTimer = undefined;

  sessions.delete(accountId);

  try {
    runtime.socket.ws.close();
  } catch {
    // Socket may already be closed.
  }
}

function disconnectCode(error: unknown): number | undefined {
  return (error instanceof Boom
    ? error.output?.statusCode
    : undefined);
}

function isLoggedOut(error: unknown): boolean {
  return disconnectCode(error) === DisconnectReason.loggedOut;
}

function isRestartRequired(error: unknown): boolean {
  return disconnectCode(error) === DisconnectReason.restartRequired;
}

function accountInfoFromSocket(
  socket: WASocket,
): WhatsAppAccountInfo | null {
  const jid = socket.user?.id;

  if (!jid) {
    return null;
  }

  const normalized = jid.split(":")[0];
  const phoneNumber = normalized.split("@")[0];

  if (!phoneNumber) {
    return null;
  }

  return {
    phoneNumber,
    displayName: socket.user?.name ?? null,
    // The actual Business/Normal classification is resolved
    // after connection using the account profile.
    whatsappType: "WHATSAPP",
    externalAccountId: jid,
  };
}

async function detectWhatsAppType(
  socket: WASocket,
): Promise<"WHATSAPP" | "WHATSAPP_BUSINESS"> {
  const jid = socket.user?.id;

  if (!jid) {
    return "WHATSAPP";
  }

  try {
    const profile = await socket.getBusinessProfile(jid);

    if (profile) {
      return "WHATSAPP_BUSINESS";
    }
  } catch {
    // A missing/unavailable business profile does not mean
    // the WhatsApp account is broken. Treat it as normal WhatsApp.
  }

  return "WHATSAPP";
}

export class BaileysWhatsAppConnector implements WhatsAppConnector {
  private readonly authStore = new BaileysAuthStateStore();

  async createQrSession(
    input: CreateQrSessionInput,
  ): Promise<WhatsAppQrSession> {
    const accountId =
      input.accountId ??
      (
        await prisma.whatsAppAccount.create({
          data: {
            userId: input.userId,
            connectorType: "BAILEYS",
            status: "CONNECTING",
          },
          select: { id: true },
        })
      ).id;

    const existing = sessions.get(accountId);

    if (existing) {
      return {
        sessionId: existing.sessionId,
        accountId: existing.accountId,
        status: existing.status,
        qrCode: existing.qrCode ?? null,
        expiresAt: existing.qrExpiresAt ?? null,
      };
    }

    const sessionId =
      `${accountId}-${Date.now().toString(36)}`;

    await prisma.whatsAppAccount.update({
      where: { id: accountId },
      data: {
        connectorType: "BAILEYS",
        status: "CONNECTING",
        lastError: null,
      },
    });

    await this.startSession(
      accountId,
      input.userId,
      sessionId,
    );

    const runtime = sessions.get(accountId);

    return {
      sessionId,
      accountId,
      status: runtime?.status ?? "CONNECTING",
      qrCode: runtime?.qrCode ?? null,
      expiresAt: runtime?.qrExpiresAt ?? null,
    };
  }

  async requestPairingCode(input: {
    userId: string;
    phoneNumber: string;
    accountId?: string;
  }): Promise<{
    sessionId: string;
    accountId: string;
    code: string;
    expiresAt?: Date | null;
  }> {
    const phoneNumber = input.phoneNumber.replace(/\\D/g, "");

    if (!phoneNumber || phoneNumber.length < 8 || phoneNumber.length > 15) {
      throw new WhatsAppConnectorError(
        "INVALID_WHATSAPP_PHONE_NUMBER",
        "Invalid WhatsApp phone number.",
      );
    }

    const accountId =
      input.accountId ??
      (
        await prisma.whatsAppAccount.create({
          data: {
            userId: input.userId,
            connectorType: "BAILEYS",
            status: "CONNECTING",
          },
          select: { id: true },
        })
      ).id;

    const existing = sessions.get(accountId);

    if (existing) {
      if (existing.status === "CONNECTED") {
        throw new WhatsAppConnectorError(
          "WHATSAPP_ALREADY_CONNECTED",
          "WhatsApp is already connected.",
        );
      }

      cleanupRuntimeSession(accountId);
    }

    const sessionId =
      `${accountId}-${Date.now().toString(36)}`;

    await prisma.whatsAppAccount.update({
      where: { id: accountId },
      data: {
        connectorType: "BAILEYS",
        status: "CONNECTING",
        lastError: null,
      },
    });

    const authState =
      await this.authStore.getState(accountId);

    const { version } =
      await fetchLatestWaWebVersion({});

    const runtime: RuntimeSession = {
      accountId,
      sessionId,
      socket: null as unknown as WASocket,
      status: "CONNECTING",
      qrCode: null,
      reconnectAttempts: 0,
    };

    const socket = makeWASocket({
      version,
      auth: authState,
      browser: Browsers.ubuntu("Chrome"),
      printQRInTerminal: false,
      syncFullHistory: false,
      markOnlineOnConnect: false,
      connectTimeoutMs: 30_000,
      keepAliveIntervalMs: 15_000,
      defaultQueryTimeoutMs: 60_000,
      generateHighQualityLinkPreview: false,
      getMessage: async () => undefined,
    });

    runtime.socket = socket;
    sessions.set(accountId, runtime);

    socket.ev.on(
      "creds.update",
      async () => {
        try {
          await this.authStore.saveCreds(
            accountId,
            authState.creds,
          );
        } catch (error) {
          console.error(
            "[whatsapp] creds.update save failed",
            {
              accountId,
              error:
                error instanceof Error
                  ? error.message
                  : "unknown",
            },
          );
        }
      },
    );

    socket.ev.on(
      "connection.update",
      async (update) => {
        const {
          connection,
          lastDisconnect,
          qr,
        } = update;

        const current = sessions.get(accountId);

        if (!current) {
          return;
        }

        if (qr && !current.qrCode) {
          current.qrCode = qr;
        }

        if (connection === "open") {
          current.status = "CONNECTED";
          current.qrCode = null;
          current.reconnectAttempts = 0;

          const info =
            accountInfoFromSocket(socket);

          const whatsappType =
            await detectWhatsAppType(socket);

          await prisma.whatsAppAccount.update({
            where: { id: accountId },
            data: {
              status: "CONNECTED",
              phoneNumber:
                info?.phoneNumber ?? phoneNumber,
              displayName:
                info?.displayName ?? undefined,
              whatsappType,
              connectedAt: new Date(),
              disconnectedAt: null,
              lastSyncAt: new Date(),
              lastError: null,
              connectorType: "BAILEYS",
            },
          });
        }
      },
    );

    startingAccounts.delete(accountId);

    try {
      const code =
        await socket.requestPairingCode(phoneNumber);

      const expiresAt =
        new Date(Date.now() + 60_000);

      runtime.qrExpiresAt = expiresAt;

      return {
        sessionId,
        accountId,
        code,
        expiresAt,
      };
    } catch (error) {
      cleanupRuntimeSession(accountId);

      await prisma.whatsAppAccount.update({
        where: { id: accountId },
        data: {
          status: "ERROR",
          lastError:
            error instanceof Error
              ? error.message
              : "Pairing code request failed.",
        },
      });

      throw new WhatsAppConnectorError(
        "WHATSAPP_PAIRING_CODE_FAILED",
        error instanceof Error
          ? error.message
          : "Failed to generate WhatsApp pairing code.",
      );
    }
  }

  async getQrSessionStatus(
    sessionId: string,
  ): Promise<WhatsAppConnectorStatus> {
    const runtime =
      [...sessions.values()].find(
        (session) => session.sessionId === sessionId,
      );

    if (!runtime) {
      throw new WhatsAppConnectorError(
        "WHATSAPP_QR_SESSION_NOT_FOUND",
        "QR session not found.",
      );
    }

    return {
      sessionId: runtime.sessionId,
      status: runtime.status,
      qrCode: runtime.qrCode ?? null,
      accountInfo:
        accountInfoFromSocket(runtime.socket),
      lastSyncAt: new Date(),
    };
  }

  async getConnectionStatus(
    accountId: string,
  ): Promise<WhatsAppConnectorStatus> {
    const runtime = sessions.get(accountId);

    if (!runtime) {
      const account =
        await prisma.whatsAppAccount.findUnique({
          where: { id: accountId },
        });

      if (!account) {
        throw new WhatsAppConnectorError(
          "WHATSAPP_ACCOUNT_NOT_FOUND",
          "WhatsApp account not found.",
        );
      }

      return {
        sessionId: "",
        status: account.status,
        accountInfo: account.phoneNumber
          ? {
              phoneNumber: account.phoneNumber,
              displayName: account.displayName,
              whatsappType:
                account.whatsappType ===
                "WHATSAPP_BUSINESS"
                  ? "WHATSAPP_BUSINESS"
                  : "WHATSAPP",
            }
          : null,
        lastSyncAt: account.lastSyncAt,
        error: account.lastError,
      };
    }

    return {
      sessionId: runtime.sessionId,
      status: runtime.status,
      qrCode: runtime.qrCode ?? null,
      accountInfo:
        accountInfoFromSocket(runtime.socket),
    };
  }

  async getAccountInfo(
    accountId: string,
  ): Promise<WhatsAppAccountInfo | null> {
    const runtime = sessions.get(accountId);

    if (runtime) {
      return accountInfoFromSocket(runtime.socket);
    }

    const account =
      await prisma.whatsAppAccount.findUnique({
        where: { id: accountId },
      });

    if (!account?.phoneNumber) {
      return null;
    }

    return {
      phoneNumber: account.phoneNumber,
      displayName: account.displayName,
      whatsappType:
        account.whatsappType === "WHATSAPP_BUSINESS"
          ? "WHATSAPP_BUSINESS"
          : "WHATSAPP",
      externalAccountId: null,
    };
  }

  async disconnect(accountId: string): Promise<void> {
    const runtime = sessions.get(accountId);

    if (runtime) {
      clearTimeout(runtime.reconnectTimer);
      runtime.reconnectTimer = undefined;

      try {
        await runtime.socket.logout();
      } catch {
        try {
          runtime.socket.ws.close();
        } catch {}
      }

      sessions.delete(accountId);
    }

    await this.authStore.clear(accountId);

    await prisma.whatsAppAccount.update({
      where: { id: accountId },
      data: {
        status: "DISCONNECTED",
        disconnectedAt: new Date(),
        lastSyncAt: new Date(),
        sessionReferenceEnc: null,
        lastError: null,
      },
    });
  }

  async restoreSession(
    accountId: string,
    userId: string,
  ): Promise<void> {
    if (sessions.has(accountId)) {
      return;
    }

    const account =
      await prisma.whatsAppAccount.findUnique({
        where: { id: accountId },
        select: {
          id: true,
          connectorType: true,
        },
      });

    if (!account) {
      throw new WhatsAppConnectorError(
        "WHATSAPP_ACCOUNT_NOT_FOUND",
        "WhatsApp account not found.",
      );
    }

    if (account.connectorType !== "BAILEYS") {
      return;
    }

    const sessionId =
      `${accountId}-${Date.now().toString(36)}`;

    await this.startSession(
      accountId,
      userId,
      sessionId,
    );
  }

  async reconnect(
    accountId: string,
  ): Promise<WhatsAppQrSession> {
    const account =
      await prisma.whatsAppAccount.findUnique({
        where: { id: accountId },
      });

    if (!account) {
      throw new WhatsAppConnectorError(
        "WHATSAPP_ACCOUNT_NOT_FOUND",
        "WhatsApp account not found.",
      );
    }

    const existing = sessions.get(accountId);

    if (existing) {
      return {
        sessionId: existing.sessionId,
        accountId: existing.accountId,
        status: existing.status,
        qrCode: existing.qrCode ?? null,
        expiresAt: existing.qrExpiresAt ?? null,
      };
    }

    const sessionId =
      `${accountId}-${Date.now().toString(36)}`;

    await this.startSession(
      accountId,
      account.userId,
      sessionId,
    );

    const runtime = sessions.get(accountId);

    return {
      sessionId,
      accountId,
      status: runtime?.status ?? "RECONNECTING",
      qrCode: runtime?.qrCode ?? null,
      expiresAt: runtime?.qrExpiresAt ?? null,
    };
  }

  async sendText(input: {
    accountId: string;
    to: string;
    text: string;
  }): Promise<{ externalMessageId: string }> {
    const runtime = sessions.get(input.accountId);

    if (!runtime || runtime.status !== "CONNECTED") {
      throw new WhatsAppConnectorError(
        "WHATSAPP_NOT_CONNECTED",
        "WhatsApp account is not connected.",
      );
    }

    const jid = input.to.includes("@")
      ? input.to
      : `${input.to.replace(/\D/g, "")}@s.whatsapp.net`;

    const result = await runtime.socket.sendMessage(
      jid,
      { text: input.text },
    );

    const messageId = result?.key?.id;

    if (!messageId) {
      throw new WhatsAppConnectorError(
        "WHATSAPP_MESSAGE_ID_MISSING",
        "WhatsApp did not return a message ID.",
      );
    }

    return {
      externalMessageId: messageId,
    };
  }

  async sendMedia(input: {
    accountId: string;
    to: string;
    mediaUrl: string;
    caption?: string;
  }): Promise<{ externalMessageId: string }> {
    const runtime = sessions.get(input.accountId);

    if (!runtime || runtime.status !== "CONNECTED") {
      throw new WhatsAppConnectorError(
        "WHATSAPP_NOT_CONNECTED",
        "WhatsApp account is not connected.",
      );
    }

    const jid = input.to.includes("@")
      ? input.to
      : `${input.to.replace(/\D/g, "")}@s.whatsapp.net`;

    const result = await runtime.socket.sendMessage(
      jid,
      {
        image: {
          url: input.mediaUrl,
        },
        caption: input.caption,
      },
    );

    const messageId = result?.key?.id;

    if (!messageId) {
      throw new WhatsAppConnectorError(
        "WHATSAPP_MESSAGE_ID_MISSING",
        "WhatsApp did not return a message ID.",
      );
    }

    return {
      externalMessageId: messageId,
    };
  }

  async healthCheck(): Promise<{
    ok: boolean;
    provider: string;
  }> {
    return {
      ok: true,
      provider: "baileys",
    };
  }

  private async startSession(
    accountId: string,
    userId: string,
    sessionId: string,
  ): Promise<void> {
    if (startingAccounts.has(accountId)) {
      return;
    }

    startingAccounts.add(accountId);

    const existing = sessions.get(accountId);

    if (existing) {
      clearTimeout(existing.qrTimer);
      clearTimeout(existing.reconnectTimer);

      existing.qrTimer = undefined;
      existing.reconnectTimer = undefined;

      sessions.delete(accountId);

      try {
        existing.socket.ws.close();
      } catch {
        // Socket may already be closed.
      }
    }

    const authState =
      await this.authStore.getState(accountId);

    let version: [number, number, number];

    try {
      const latest = await fetchLatestWaWebVersion({});
      version = latest.version;

      console.log(
        JSON.stringify({
          event: "whatsapp.wa_web_version",
          version: version.join("."),
          isLatest: latest.isLatest,
        }),
      );
    } catch (error) {
      console.warn(
        JSON.stringify({
          event: "whatsapp.wa_web_version_fetch_failed",
          error:
            error instanceof Error
              ? error.message
              : "unknown",
        }),
      );

      throw new WhatsAppConnectorError(
        "WHATSAPP_WEB_VERSION_UNAVAILABLE",
        "Unable to resolve the current WhatsApp Web version.",
      );
    }

    const runtime: RuntimeSession = {
      accountId,
      sessionId,
      socket: null as unknown as WASocket,
      status: "CONNECTING",
      qrCode: null,
      reconnectAttempts: 0,
    };

    const socket = makeWASocket({
      version,
      auth: authState,
      browser: Browsers.ubuntu("Chrome"),
      printQRInTerminal: false,
      syncFullHistory: false,
      markOnlineOnConnect: false,
      connectTimeoutMs: 30_000,
      keepAliveIntervalMs: 15_000,
      defaultQueryTimeoutMs: 60_000,
      generateHighQualityLinkPreview: false,
      getMessage: async () => undefined,
    });

    runtime.socket = socket;
    sessions.set(accountId, runtime);

    socket.ev.on(
      "creds.update",
      async () => {
        try {
          await this.authStore.saveCreds(
            accountId,
            authState.creds,
          );
        } catch (error) {
          console.error(
            "[whatsapp] creds.update save failed",
            {
              accountId,
              error:
                error instanceof Error
                  ? error.message
                  : "unknown",
            },
          );
        }
      },
    );

    socket.ev.on(
      "connection.update",
      async (update) => {
        const {
          connection,
          lastDisconnect,
          qr,
        } = update;

        const current = sessions.get(accountId);

        if (!current) {
          return;
        }

        if (qr) {
          current.qrCode = qr;
          current.status = "QR_REQUIRED";

          await prisma.whatsAppAccount.update({
            where: { id: accountId },
            data: {
              status: "CONNECTING",
              lastSyncAt: new Date(),
              lastError: null,
            },
          });
        }

        if (connection === "open") {
          current.status = "CONNECTED";
          current.qrCode = null;
          current.reconnectAttempts = 0;

          const info =
            accountInfoFromSocket(socket);

          const whatsappType =
            await detectWhatsAppType(socket);

          await prisma.whatsAppAccount.update({
            where: { id: accountId },
            data: {
              status: "CONNECTED",
              phoneNumber:
                info?.phoneNumber ?? undefined,
              displayName:
                info?.displayName ?? undefined,
              whatsappType,

              connectedAt: new Date(),
              disconnectedAt: null,
              lastSyncAt: new Date(),
              lastError: null,
              connectorType: "BAILEYS",
            },
          });
        }

        if (connection === "close") {
          const loggedOut =
            isLoggedOut(lastDisconnect?.error);

          current.status = loggedOut
            ? "REVOKED"
            : "RECONNECTING";

          await prisma.whatsAppAccount.update({
            where: { id: accountId },
            data: {
              status: loggedOut
                ? "ERROR"
                : "CONNECTING",
              disconnectedAt: new Date(),
              lastSyncAt: new Date(),
              lastError: loggedOut
                ? "WhatsApp session was logged out."
                : `Connection closed: ${
                    disconnectCode(
                      lastDisconnect?.error,
                    ) ?? "unknown"
                  }`,
            },
          });

          if (loggedOut) {
            cleanupRuntimeSession(accountId);
            await this.authStore.clear(accountId);
            return;
          }

          if (
            isRestartRequired(lastDisconnect?.error)
          ) {
            current.reconnectAttempts = 0;

            clearTimeout(current.reconnectTimer);
            current.reconnectTimer = undefined;

            current.reconnectTimer = setTimeout(() => {
              current.reconnectTimer = undefined;

              void this.startSession(
                accountId,
                userId,
                sessionId,
              );
            }, 500);

            return;
          }

          current.reconnectAttempts += 1;

          if (current.reconnectAttempts > 10) {
            current.status = "ERROR";

            await prisma.whatsAppAccount.update({
              where: { id: accountId },
              data: {
                status: "ERROR",
                lastError:
                  "Maximum WhatsApp reconnect attempts reached.",
              },
            });

            cleanupRuntimeSession(accountId);
            return;
          }

          clearTimeout(current.reconnectTimer);
          current.reconnectTimer = undefined;

          const delay = Math.min(
            1000 *
              Math.pow(
                2,
                current.reconnectAttempts - 1,
              ),
            30_000,
          );

          current.reconnectTimer =
            setTimeout(() => {
              current.reconnectTimer = undefined;

              void this.startSession(
                accountId,
                userId,
                sessionId,
              );
            }, delay);
        }
      },
    );

    startingAccounts.delete(accountId);

    socket.ev.on(
      "messages.upsert",
      async (event) => {
        if (event.type !== "notify") {
          return;
        }

        for (const message of event.messages) {
          if (message.key.fromMe) {
            continue;
          }

          const normalized =
            normalizeBaileysMessage(
              message,
              accountId,
            );

          if (!normalized.externalMessageId) {
            continue;
          }

          if (!normalized.fromNumber) {
            console.warn(
              JSON.stringify({
                event: "whatsapp.message.skipped",
                accountId,
                messageId:
                  normalized.externalMessageId,
                reason:
                  "SENDER_NUMBER_UNAVAILABLE",
              }),
            );
            continue;
          }

          try {
            await processInboundMessage(
              normalized,
            );

            console.log(
              JSON.stringify({
                event:
                  "whatsapp.message.processed",
                accountId,
                messageId:
                  normalized.externalMessageId,
                type: normalized.type,
              }),
            );
          } catch (error) {
            console.error(
              JSON.stringify({
                event:
                  "whatsapp.message.processing_failed",
                accountId,
                messageId:
                  normalized.externalMessageId,
                error:
                  error instanceof Error
                    ? error.message
                    : "unknown",
              }),
            );
          }
        }
      },
    );
  }
}
