import { prisma } from "../../lib/prisma.js";
import {
  CONVERSATION_MODES,
  type ConversationMode,
} from "./conversation.types.js";

export async function getConversation(
  conversationId: string,
) {
  return prisma.conversation.findUnique({
    where: {
      id: conversationId,
    },
  });
}

export async function setConversationMode(
  conversationId: string,
  mode: ConversationMode,
) {
  /*
   * Conversation-state persistence will be connected
   * to the existing Conversation schema.
   *
   * Until the exact state fields are present, keep the
   * mode as application-level metadata in a safe JSON
   * field only when such a field already exists.
   *
   * This function intentionally does not guess Prisma
   * column names.
   */

  const conversation =
    await prisma.conversation.findUnique({
      where: {
        id: conversationId,
      },
    });

  if (!conversation) {
    throw new Error(
      "CONVERSATION_NOT_FOUND",
    );
  }

  return {
    conversationId,
    mode,
    previous: CONVERSATION_MODES.AI_ACTIVE,
  };
}

export function shouldAiReply(
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
