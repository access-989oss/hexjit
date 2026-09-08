import type { JobsOptions } from "bullmq";
import { automationSchedulerQueue } from "./scheduler.queue.js";

export type ScheduledAutomationActionJob = {
  automationId: string;
  userId: string;
  accountId: string;
  conversationId?: string;
  recipientPhone?: string;
  actions: Array<{
    type: string;
    config: Record<string, unknown>;
  }>;
  startAtIndex: number;
  metadata?: Record<string, unknown>;
};

function parseDelayMs(
  config: Record<string, unknown>,
): number {
  const rawMs = config.delayMs;

  if (
    typeof rawMs === "number" &&
    Number.isFinite(rawMs) &&
    rawMs >= 0
  ) {
    return rawMs;
  }

  const rawSeconds = config.seconds;

  if (
    typeof rawSeconds === "number" &&
    Number.isFinite(rawSeconds) &&
    rawSeconds >= 0
  ) {
    return rawSeconds * 1000;
  }

  const rawMinutes = config.minutes;

  if (
    typeof rawMinutes === "number" &&
    Number.isFinite(rawMinutes) &&
    rawMinutes >= 0
  ) {
    return rawMinutes * 60 * 1000;
  }

  const rawHours = config.hours;

  if (
    typeof rawHours === "number" &&
    Number.isFinite(rawHours) &&
    rawHours >= 0
  ) {
    return rawHours * 60 * 60 * 1000;
  }

  const rawDelay = config.delay;

  if (typeof rawDelay === "string") {
    const match =
      rawDelay.trim().match(
        /^(\d+(?:\.\d+)?)\s*(ms|s|m|h|d)$/i,
      );

    if (match) {
      const value = Number(match[1]);
      const unit = match[2].toLowerCase();

      const multipliers: Record<string, number> = {
        ms: 1,
        s: 1000,
        m: 60 * 1000,
        h: 60 * 60 * 1000,
        d: 24 * 60 * 60 * 1000,
      };

      return value * multipliers[unit];
    }
  }

  return 0;
}

export async function scheduleAutomationAction(
  input: ScheduledAutomationActionJob,
  waitConfig: Record<string, unknown>,
) {
  const delay = parseDelayMs(waitConfig);

  const jobOptions: JobsOptions = {
    delay,
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: {
      age: 24 * 60 * 60,
      count: 5000,
    },
    removeOnFail: {
      age: 7 * 24 * 60 * 60,
    },

    /*
     * Deterministic job id prevents accidental duplicate
     * scheduling when the same automation event is retried.
     */
    jobId: [
      input.automationId,
      input.userId,
      input.conversationId ?? "no-conversation",
      String(input.startAtIndex),
      String(Date.now()),
    ].join(":"),
  };

  return automationSchedulerQueue.add(
    "AUTOMATION_ACTION",
    input,
    jobOptions,
  );
}
