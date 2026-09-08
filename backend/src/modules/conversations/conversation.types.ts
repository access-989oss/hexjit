export const CONVERSATION_MODES = {
  AI_ACTIVE: "AI_ACTIVE",
  HUMAN_ACTIVE: "HUMAN_ACTIVE",
  AI_PAUSED: "AI_PAUSED",
} as const;

export type ConversationMode =
  (typeof CONVERSATION_MODES)[keyof typeof CONVERSATION_MODES];
