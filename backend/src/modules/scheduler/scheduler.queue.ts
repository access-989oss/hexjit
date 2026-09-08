import {
  Queue,
  type JobsOptions,
} from "bullmq";

import { redis } from "../../lib/redis.js";

export const HEXJIT_SCHEDULER_QUEUE =
  "hexjit-scheduler";

export const schedulerQueue =
  new Queue(
    HEXJIT_SCHEDULER_QUEUE,
    {
      connection: redis,
      defaultJobOptions: {
        removeOnComplete: {
          age: 60 * 60 * 24,
          count: 5000,
        },
        removeOnFail: {
          age: 60 * 60 * 24 * 7,
        },
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 5000,
        },
      },
    },
  );

export async function scheduleJob<T>(
  name: string,
  data: T,
  delayMs: number,
  options?: JobsOptions,
) {
  const safeDelay =
    Math.max(
      0,
      Math.floor(delayMs),
    );

  return schedulerQueue.add(
    name,
    data,
    {
      delay: safeDelay,
      ...options,
    },
  );
}


/*
 * Compatibility alias used by the automation-action
 * scheduler. This points to the existing scheduler queue;
 * it does not create a second BullMQ queue.
 */
export const automationSchedulerQueue = schedulerQueue;
