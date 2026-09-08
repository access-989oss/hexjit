export {
  listWhatsAppAccounts,
  createWhatsAppAccount,
  getWhatsAppAccountSecret,
  updateWhatsAppStatus,
} from "./account/account.service.js";

export {
  saveWebhookEvent,
  markWebhookProcessed,
  markWebhookFailed,
} from "./webhook/webhook.service.js";

export {
  saveInboundMessage,
  listMessages,
} from "./message/message.service.js";

export {
  registerWhatsAppWebhookRoutes,
} from "./webhook/webhook.routes.js";

export { normalizeMetaWebhookMessages, processNormalizedMessages } from "./normalizer/index.js";

export {
  findWhatsAppAccountByPhoneNumberId,
  findWhatsAppAccountForUser,
} from "./account/account-lookup.service.js";

export {
  upsertWhatsAppContact,
  getWhatsAppContact,
  listWhatsAppContacts,
} from "./contact/index.js";

export {
  listWhatsAppGroups,
  getWhatsAppGroupsForAccount,
} from "./group/index.js";
