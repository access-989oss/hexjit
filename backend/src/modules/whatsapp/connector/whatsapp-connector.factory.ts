import type { WhatsAppConnector } from "./whatsapp-connector.types.js";
import { UnconfiguredWhatsAppConnector } from "./unconfigured-whatsapp.connector.js";

let connector: WhatsAppConnector | null = null;

export function getWhatsAppConnector(): WhatsAppConnector {
  if (!connector) {
    connector = new UnconfiguredWhatsAppConnector();
  }

  return connector;
}

export function setWhatsAppConnector(
  nextConnector: WhatsAppConnector,
): void {
  connector = nextConnector;
}
