import {
  handleAiReply,
} from "../whatsapp/runtime/inbound-message.service.js";

import type {
  DelayedReplyJobData,
} from "./scheduler.types.js";

/**
 * Worker-side execution of a delayed AI reply.
 *
 * The persona, memory, and recent messages are re-loaded at
 * execution time so the reply reflects the freshest context.
 * `skipDelay: true` prevents infinite re-scheduling.
 */
export async function executeDelayedReply(
  data: DelayedReplyJobData,
) {
  return handleAiReply({
    userId: data.userId,
    accountId: data.accountId,
    conversationId: data.conversationId,
    recipientPhone: data.recipientPhone,
    text: data.text,
    externalMessageId: data.externalMessageId,
    skipDelay: true,
  });
}
