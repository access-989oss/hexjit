export type {
  WhatsAppNormalizedMessage,
  WhatsAppNormalizedMessageType,
} from "./whatsapp.types.js";

export {
  normalizeMetaWebhookMessages,
} from "./whatsapp.normalizer.js";

export {
  processNormalizedMessages,
} from "./normalizer.service.js";
