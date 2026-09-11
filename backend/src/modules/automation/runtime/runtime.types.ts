export type AutomationRuntimeEvent = {
  type: string;
  userId: string;
  accountId: string;
  conversationId?: string;
  contactId?: string;
  groupId?: string;
  text?: string;
  messageId?: string;
  metadata?: Record<string, unknown>;
};

export type AutomationRuntimeAction = {
  type: string;
  config: Record<string, unknown>;
};

export type AutomationRuntimeContext = {
  scheduleWait?: (
    config: Record<string, unknown>,
    actionIndex: number,
  ) => Promise<unknown>;

  /*
   * Runtime-level WhatsApp sender.
   * The recipient is supplied by the event/context,
   * while AutomationExecutionContext exposes sendText(text).
   */
  sendText?: (
    recipientPhone: string,
    text: string,
  ) => Promise<unknown>;

  aiReply?: (
    input: Record<string, unknown>,
  ) => Promise<unknown>;

  sendImage?: (
    input: Record<string, unknown>,
  ) => Promise<unknown>;

  analyzeImage?: (
    input: Record<string, unknown>,
  ) => Promise<unknown>;

  scheduleFollowUp?: (
    input: Record<string, unknown>,
  ) => Promise<unknown>;
};
