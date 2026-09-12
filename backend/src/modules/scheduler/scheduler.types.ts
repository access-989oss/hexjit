export const SCHEDULED_JOB_TYPES = {
  FOLLOW_UP: "FOLLOW_UP",
  AUTOMATION_ACTION: "AUTOMATION_ACTION",
  DELAYED_REPLY: "DELAYED_REPLY",
  SYSTEM_TASK: "SYSTEM_TASK",
} as const;

export type ScheduledJobType =
  (typeof SCHEDULED_JOB_TYPES)[keyof typeof SCHEDULED_JOB_TYPES];

export type FollowUpJobData = {
  automationId?: string;
  userId: string;
  accountId: string;
  recipientPhone: string;
  message?: string;
  metadata?: Record<string, unknown>;
};

export type ScheduledAutomationJobData = {
  automationId: string;
  userId: string;
  accountId: string;
  conversationId?: string;
  action: string;
  config?: Record<string, unknown>;
};

export type DelayedReplyJobData = {
  userId: string;
  accountId: string;
  conversationId: string;
  recipientPhone: string;
  text: string;
  externalMessageId: string;
};
