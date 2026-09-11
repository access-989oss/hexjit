import type { WhatsAppConnector } from "./whatsapp-connector.types.js";
import { BaileysWhatsAppConnector } from "./baileys-whatsapp.connector.js";

let connector: WhatsAppConnector | null = null;

export function getWhatsAppConnector(): WhatsAppConnector {
  if (!connector) {
    connector = new BaileysWhatsAppConnector();
  }

  return connector;
}

export function setWhatsAppConnector(
  nextConnector: WhatsAppConnector,
): void {
  connector = nextConnector;
}
