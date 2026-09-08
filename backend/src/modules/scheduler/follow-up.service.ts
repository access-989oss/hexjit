import {
  scheduleJob,
} from "./scheduler.queue.js";

import {
  SCHEDULED_JOB_TYPES,
  type FollowUpJobData,
} from "./scheduler.types.js";

export async function scheduleFollowUp(
  data: FollowUpJobData,
  delayMs: number,
) {
  if (!data.userId) {
    throw new Error(
      "FOLLOW_UP_USER_ID_REQUIRED",
    );
  }

  if (!data.accountId) {
    throw new Error(
      "FOLLOW_UP_ACCOUNT_ID_REQUIRED",
    );
  }

  if (!data.recipientPhone) {
    throw new Error(
      "FOLLOW_UP_RECIPIENT_REQUIRED",
    );
  }

  if (
    !Number.isFinite(delayMs) ||
    delayMs < 0
  ) {
    throw new Error(
      "INVALID_FOLLOW_UP_DELAY",
    );
  }

  return scheduleJob(
    SCHEDULED_JOB_TYPES.FOLLOW_UP,
    data,
    delayMs,
  );
}
