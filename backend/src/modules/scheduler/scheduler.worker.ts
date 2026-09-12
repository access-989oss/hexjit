import { executeAutomationContinuation } from "./automation-continuation.service.js";
import { executeFollowUpJob } from "./follow-up-runtime.service.js";
import { executeDelayedReply } from "./delayed-reply-runtime.service.js";
import {
  Worker,
  type Job,
} from "bullmq";

import {
  redis,
} from "../../lib/redis.js";

import {
  HEXJIT_SCHEDULER_QUEUE,
} from "./scheduler.queue.js";

import {
  SCHEDULED_JOB_TYPES,
  type FollowUpJobData,
  type DelayedReplyJobData,
} from "./scheduler.types.js";

import {
  sendWhatsAppTextMessage,
} from "../whatsapp/message/outbound.service.js";

async function processFollowUp(
  job: Job<FollowUpJobData>,
) {
  const {
    accountId,
    recipientPhone,
    message,
  } = job.data;

  if (!message?.trim()) {
    throw new Error(
      "FOLLOW_UP_MESSAGE_EMPTY",
    );
  }

  return executeFollowUpJob({
    accountId,
    recipientPhone,
    message: message ?? "",
  });
}


export const schedulerWorker =
  new Worker(
    HEXJIT_SCHEDULER_QUEUE,
    async (job) => {
      switch (job.name) {
        case SCHEDULED_JOB_TYPES.AUTOMATION_ACTION:
          return executeAutomationContinuation(
            job.data as {
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
            },
          );

        case SCHEDULED_JOB_TYPES.FOLLOW_UP:
          return processFollowUp(
            job as Job<FollowUpJobData>,
          );

        case SCHEDULED_JOB_TYPES.DELAYED_REPLY:
          return executeDelayedReply(
            job.data as DelayedReplyJobData,
          );

        case SCHEDULED_JOB_TYPES.SYSTEM_TASK:
          return {
            acknowledged: true,
          };

        default:
          throw new Error(
            `UNKNOWN_SCHEDULED_JOB:${job.name}`,
          );
      }
    },
    {
      connection: redis,
      concurrency: 10,
    },
  );

schedulerWorker.on(
  "completed",
  (job) => {
    console.log(
      `[scheduler] completed job=${job.name} id=${job.id}`,
    );
  },
);

schedulerWorker.on(
  "failed",
  (job, error) => {
    console.error(
      `[scheduler] failed job=${job?.name ?? "unknown"} id=${job?.id ?? "unknown"} error=${error.message}`,
    );
  },
);

schedulerWorker.on(
  "error",
  (error) => {
    console.error(
      `[scheduler] worker error=${error.message}`,
    );
  },
);
