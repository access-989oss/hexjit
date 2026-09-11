import { prisma } from "../../../lib/prisma.js";
import { getWhatsAppConnector } from "./whatsapp-connector.factory.js";
import { WhatsAppConnectorError } from "./whatsapp-connector.error.js";

export async function createUserQrSession(userId: string) {
  const connector = getWhatsAppConnector();

  const account = await prisma.whatsAppAccount.findFirst({
    where: {
      userId,
    },
    orderBy: {
      createdAt: "asc",
    },
    select: {
      id: true,
    },
  });

  const session = await connector.createQrSession({
    userId,
    accountId: account?.id,
  });

  return {
    sessionId: session.sessionId,
    status: session.status,
    qrCode: session.qrCode ?? null,
    expiresAt: session.expiresAt ?? null,
  };
}

export async function getUserQrSessionStatus(
  userId: string,
  sessionId: string,
) {
  const account = await prisma.whatsAppAccount.findFirst({
    where: {
      userId,
    },
    select: {
      id: true,
    },
  });

  if (!account) {
    throw new WhatsAppConnectorError(
      "WHATSAPP_ACCOUNT_NOT_FOUND",
      "WhatsApp account not found.",
    );
  }

  const status = await getWhatsAppConnector().getQrSessionStatus(
    sessionId,
  );

  const sessionBelongsToUser =
    status.sessionId.startsWith(`${account.id}-`);

  if (!sessionBelongsToUser) {
    throw new WhatsAppConnectorError(
      "WHATSAPP_QR_SESSION_FORBIDDEN",
      "QR session does not belong to the authenticated user.",
    );
  }

  return {
    sessionId: status.sessionId,
    status: status.status,
    qrCode: status.qrCode ?? null,
    accountInfo: status.accountInfo ?? null,
    lastSyncAt: status.lastSyncAt ?? null,
    error: status.error ?? null,
  };
}

export async function getUserWhatsAppStatus(userId: string) {
  const account = await prisma.whatsAppAccount.findFirst({
    where: {
      userId,
    },
    orderBy: {
      createdAt: "asc",
    },
    select: {
      id: true,
      phoneNumber: true,
      displayName: true,
      whatsappType: true,
      status: true,
      connectedAt: true,
      disconnectedAt: true,
      lastSyncAt: true,
      lastError: true,
      connectorType: true,
    },
  });

  if (!account) {
    return {
      connected: false,
      account: null,
      connector: "baileys",
    };
  }

  const runtimeStatus =
    await getWhatsAppConnector().getConnectionStatus(
      account.id,
    );

  return {
    connected: runtimeStatus.status === "CONNECTED",
    account: {
      id: account.id,
      phoneNumber:
        runtimeStatus.accountInfo?.phoneNumber ??
        account.phoneNumber,
      displayName:
        runtimeStatus.accountInfo?.displayName ??
        account.displayName,
      whatsappType:
        runtimeStatus.accountInfo?.whatsappType ??
        (account.whatsappType === "WHATSAPP_BUSINESS"
          ? "WHATSAPP_BUSINESS"
          : "WHATSAPP"),
      status: runtimeStatus.status,
      connectedAt: account.connectedAt,
      disconnectedAt: account.disconnectedAt,
      lastSyncAt:
        runtimeStatus.lastSyncAt ??
        account.lastSyncAt,
      lastError:
        runtimeStatus.error ??
        account.lastError,
      connectorType: account.connectorType,
    },
    connector: "baileys",
  };
}

export async function disconnectUserWhatsApp(
  userId: string,
) {
  const account = await prisma.whatsAppAccount.findFirst({
    where: {
      userId,
    },
    orderBy: {
      createdAt: "asc",
    },
    select: {
      id: true,
    },
  });

  if (!account) {
    throw new WhatsAppConnectorError(
      "WHATSAPP_ACCOUNT_NOT_FOUND",
      "WhatsApp account not found.",
    );
  }

  await getWhatsAppConnector().disconnect(account.id);

  return {
    success: true,
  };
}

export async function reconnectUserWhatsApp(
  userId: string,
) {
  const account = await prisma.whatsAppAccount.findFirst({
    where: {
      userId,
    },
    orderBy: {
      createdAt: "asc",
    },
    select: {
      id: true,
    },
  });

  if (!account) {
    throw new WhatsAppConnectorError(
      "WHATSAPP_ACCOUNT_NOT_FOUND",
      "WhatsApp account not found.",
    );
  }

  const session =
    await getWhatsAppConnector().reconnect(account.id);

  return {
    sessionId: session.sessionId,
    status: session.status,
    qrCode: session.qrCode ?? null,
    expiresAt: session.expiresAt ?? null,
  };
}
