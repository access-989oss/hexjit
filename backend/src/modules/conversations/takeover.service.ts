import {
  CONVERSATION_MODES,
  type ConversationMode,
} from "./conversation.types.js";

export function activateHumanTakeover(): ConversationMode {
  return CONVERSATION_MODES.HUMAN_ACTIVE;
}

export function resumeAi(): ConversationMode {
  return CONVERSATION_MODES.AI_ACTIVE;
}

export function pauseAi(): ConversationMode {
  return CONVERSATION_MODES.AI_PAUSED;
}

export function isAiActive(
  mode: ConversationMode,
): boolean {
  return (
    mode === CONVERSATION_MODES.AI_ACTIVE
  );
}

export function isHumanActive(
  mode: ConversationMode,
): boolean {
  return (
    mode === CONVERSATION_MODES.HUMAN_ACTIVE
  );
}
