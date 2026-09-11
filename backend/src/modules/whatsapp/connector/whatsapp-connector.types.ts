export type WhatsAppType =
  | "WHATSAPP"
  | "WHATSAPP_BUSINESS";

export type WhatsAppConnectionStatus =
  | "DISCONNECTED"
  | "CONNECTING"
  | "QR_REQUIRED"
  | "CONNECTED"
  | "RECONNECTING"
  | "ERROR"
  | "REVOKED";

export interface WhatsAppQrSession {
  sessionId: string;
  status: WhatsAppConnectionStatus;
  qrCode?: string | null;
  expiresAt?: Date | null;
}

export interface WhatsAppAccountInfo {
  phoneNumber: string;
  displayName?: string | null;
  whatsappType: WhatsAppType;
  externalAccountId?: string | null;
}

export interface WhatsAppConnectorStatus {
  sessionId: string;
  status: WhatsAppConnectionStatus;
  accountInfo?: WhatsAppAccountInfo | null;
  qrCode?: string | null;
  lastSyncAt?: Date | null;
  error?: string | null;
}

export interface CreateQrSessionInput {
  userId: string;
  accountId?: string;
}

export interface WhatsAppConnector {
  createQrSession(
    input: CreateQrSessionInput,
  ): Promise<WhatsAppQrSession>;

  getQrSessionStatus(
    sessionId: string,
  ): Promise<WhatsAppConnectorStatus>;

  getConnectionStatus(
    accountId: string,
  ): Promise<WhatsAppConnectorStatus>;

  getAccountInfo(
    accountId: string,
  ): Promise<WhatsAppAccountInfo | null>;

  restoreSession(
    accountId: string,
    userId: string,
  ): Promise<void>;

  disconnect(
    accountId: string,
  ): Promise<void>;

  reconnect(
    accountId: string,
  ): Promise<WhatsAppQrSession>;

  sendText(input: {
    accountId: string;
    to: string;
    text: string;
  }): Promise<{
    externalMessageId: string;
  }>;

  sendMedia(input: {
    accountId: string;
    to: string;
    mediaUrl: string;
    caption?: string;
  }): Promise<{
    externalMessageId: string;
  }>;

  healthCheck(): Promise<{
    ok: boolean;
    provider: string;
  }>;
}
