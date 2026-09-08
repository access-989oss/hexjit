import {
  CONVERSATION_MODES,
  type ConversationMode,
} from "./conversation.types.js";

export type ConversationDecisionReason =
  | "IGNORED"
  | "HUMAN_ACTIVE"
  | "AI_PAUSED"
  | "AI_ACTIVE";

export type ConversationDecision = {
  shouldReply: boolean;
  shouldRunAutomation: boolean;
  shouldConsumeCredits: boolean;
  reason: ConversationDecisionReason;
};

export function decideConversationAction(input: {
  mode: ConversationMode;
  contactIgnored?: boolean;
  groupIgnored?: boolean;
  messageFilterAction?: "ALLOW" | "IGNORE" | "FLAG";
}): ConversationDecision {
  /*
   * Priority #1:
   * Explicit ignore always wins.
   */
  if (
    input.contactIgnored === true ||
    input.groupIgnored === true
  ) {
    return {
      shouldReply: false,
      shouldRunAutomation: false,
      shouldConsumeCredits: false,
      reason: "IGNORED",
    };
  }

  /*
   * Spam/promotion filter runs before AI.
   */
  if (
    input.messageFilterAction === "IGNORE"
  ) {
    return {
      shouldReply: false,
      shouldRunAutomation: false,
      shouldConsumeCredits: false,
      reason: "IGNORED",
    };
  }

  /*
   * Priority #2:
   * Human takeover stops AI for this conversation only.
   */
  if (
    input.mode ===
    CONVERSATION_MODES.HUMAN_ACTIVE
  ) {
    return {
      shouldReply: false,
      shouldRunAutomation: false,
      shouldConsumeCredits: false,
      reason: "HUMAN_ACTIVE",
    };
  }

  /*
   * Priority #3:
   * AI explicitly paused.
   */
  if (
    input.mode ===
    CONVERSATION_MODES.AI_PAUSED
  ) {
    return {
      shouldReply: false,
      shouldRunAutomation: false,
      shouldConsumeCredits: false,
      reason: "AI_PAUSED",
    };
  }

  /*
   * Normal AI operation.
   */
  return {
    shouldReply: true,
    shouldRunAutomation: true,
    shouldConsumeCredits: true,
    reason: "AI_ACTIVE",
  };
}
