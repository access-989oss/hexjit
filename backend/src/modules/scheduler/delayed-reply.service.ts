import {
  scheduleJob,
} from "./scheduler.queue.js";

import {
  SCHEDULED_JOB_TYPES,
  type DelayedReplyJobData,
} from "./scheduler.types.js";

/**
 * Schedule an AI reply to be generated and sent after `delayMs`.
 *
 * Uses BullMQ's delayed job mechanism so the delay is crash-safe.
 * Do NOT use setTimeout for this — a worker restart would drop
 * pending replies.
 */
export async function scheduleDelayedReply(
  data: DelayedReplyJobData,
  delayMs: number,
) {
  if (!data.userId) {
    throw new Error("DELAYED_REPLY_USER_ID_REQUIRED");
  }

  if (!data.accountId) {
    throw new Error("DELAYED_REPLY_ACCOUNT_ID_REQUIRED");
  }

  if (!data.recipientPhone) {
    throw new Error("DELAYED_REPLY_RECIPIENT_REQUIRED");
  }

  if (!data.text?.trim()) {
    throw new Error("DELAYED_REPLY_TEXT_REQUIRED");
  }

  if (
    !Number.isFinite(delayMs) ||
    delayMs <= 0
  ) {
    throw new Error("DELAYED_REPLY_INVALID_DELAY");
  }

  return scheduleJob(
    SCHEDULED_JOB_TYPES.DELAYED_REPLY,
    data,
    delayMs,
  );
}
