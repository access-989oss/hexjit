import { WhatsAppConnectorError } from "./whatsapp-connector.error.js";
import type {
  CreateQrSessionInput,
  WhatsAppAccountInfo,
  WhatsAppConnector,
  WhatsAppConnectorStatus,
  WhatsAppQrSession,
} from "./whatsapp-connector.types.js";

const NOT_CONFIGURED = "WHATSAPP_CONNECTOR_NOT_CONFIGURED";

function notConfigured(): never {
  throw new WhatsAppConnectorError(
    NOT_CONFIGURED,
    "WhatsApp QR connector is not configured yet.",
  );
}

export class UnconfiguredWhatsAppConnector implements WhatsAppConnector {
  async createQrSession(
    _input: CreateQrSessionInput,
  ): Promise<WhatsAppQrSession> {
    return notConfigured();
  }

  async getQrSessionStatus(
    _sessionId: string,
  ): Promise<WhatsAppConnectorStatus> {
    return notConfigured();
  }

  async getConnectionStatus(
    _accountId: string,
  ): Promise<WhatsAppConnectorStatus> {
    return notConfigured();
  }

  async getAccountInfo(
    _accountId: string,
  ): Promise<WhatsAppAccountInfo | null> {
    return notConfigured();
  }

  async disconnect(_accountId: string): Promise<void> {
    return notConfigured();
  }

  async reconnect(_accountId: string): Promise<WhatsAppQrSession> {
    return notConfigured();
  }

  async sendText(_input: {
    accountId: string;
    to: string;
    text: string;
  }): Promise<{ externalMessageId: string }> {
    return notConfigured();
  }

  async sendMedia(_input: {
    accountId: string;
    to: string;
    mediaUrl: string;
    caption?: string;
  }): Promise<{ externalMessageId: string }> {
    return notConfigured();
  }

  async healthCheck(): Promise<{
    ok: boolean;
    provider: string;
  }> {
    return {
      ok: false,
      provider: "unconfigured",
    };
  }
}
