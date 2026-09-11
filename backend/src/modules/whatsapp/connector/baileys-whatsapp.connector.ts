import makeWASocket, {
  Browsers,
  DisconnectReason,
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

type RuntimeSession = {
  accountId: string;
  sessionId: string;
  socket: WASocket;
  status: WhatsAppConnectionStatus;
  qrCode?: string | null;
  reconnectTimer?: NodeJS.Timeout;
  reconnectAttempts: number;
};

const sessions = new Map<string, RuntimeSession>();

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
    whatsappType: "WHATSAPP",
    externalAccountId: jid,
  };
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
        status: existing.status,
        qrCode: existing.qrCode ?? null,
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
      status: runtime?.status ?? "CONNECTING",
      qrCode: runtime?.qrCode ?? null,
    };
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
        status: existing.status,
        qrCode: existing.qrCode ?? null,
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
      status: runtime?.status ?? "RECONNECTING",
      qrCode: runtime?.qrCode ?? null,
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
    const authState =
      await this.authStore.getState(accountId);

    const runtime: RuntimeSession = {
      accountId,
      sessionId,
      socket: null as unknown as WASocket,
      status: "CONNECTING",
      qrCode: null,
      reconnectAttempts: 0,
    };

    const socket = makeWASocket({
      auth: authState,
      browser: Browsers.ubuntu("Hexjit"),
      printQRInTerminal: false,
      syncFullHistory: false,
      markOnlineOnConnect: false,
    });

    runtime.socket = socket;
    sessions.set(accountId, runtime);

    socket.ev.on(
      "creds.update",
      async (update) => {
        const current =
          await this.authStore.getState(accountId);

        const merged: AuthenticationCreds = {
          ...current.creds,
          ...update,
        };

        await this.authStore.saveCreds(
          accountId,
          merged,
        );
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

          await prisma.whatsAppAccount.update({
            where: { id: accountId },
            data: {
              status: "CONNECTED",
              phoneNumber:
                info?.phoneNumber ?? undefined,
              displayName:
                info?.displayName ?? undefined,
              whatsappType:
                info?.whatsappType ?? "WHATSAPP",
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
            sessions.delete(accountId);
            await this.authStore.clear(accountId);
            return;
          }

          if (
            isRestartRequired(lastDisconnect?.error)
          ) {
            current.reconnectAttempts = 0;
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

            sessions.delete(accountId);
            return;
          }

          clearTimeout(current.reconnectTimer);

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
              void this.startSession(
                accountId,
                userId,
                sessionId,
              );
            }, delay);
        }
      },
    );

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

          console.log(
            JSON.stringify({
              event: "whatsapp.message.received",
              accountId,
              messageId: message.key.id,
              remoteJid: message.key.remoteJid,
            }),
          );
        }
      },
    );
  }
}
