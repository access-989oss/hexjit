import {
  scheduleJob,
} from "./scheduler.queue.js";

import {
  SCHEDULED_JOB_TYPES,
  type ScheduledAutomationJobData,
} from "./scheduler.types.js";

export async function scheduleAutomationAction(
  data: ScheduledAutomationJobData,
  delayMs: number,
) {
  if (!data.automationId) {
    throw new Error(
      "AUTOMATION_ID_REQUIRED",
    );
  }

  if (!data.userId) {
    throw new Error(
      "AUTOMATION_USER_ID_REQUIRED",
    );
  }

  if (!data.accountId) {
    throw new Error(
      "AUTOMATION_ACCOUNT_ID_REQUIRED",
    );
  }

  if (!data.action) {
    throw new Error(
      "AUTOMATION_ACTION_REQUIRED",
    );
  }

  if (
    !Number.isFinite(delayMs) ||
    delayMs < 0
  ) {
    throw new Error(
      "INVALID_AUTOMATION_DELAY",
    );
  }

  return scheduleJob(
    SCHEDULED_JOB_TYPES.AUTOMATION_ACTION,
    data,
    delayMs,
  );
}
