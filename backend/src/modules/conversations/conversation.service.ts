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

export async function getOrCreateConversation(input: {
  userId: string;
  accountId: string;
  externalId: string;
  title?: string;
}) {
  const existing =
    await prisma.conversation.findUnique({
      where: {
        accountId_externalId: {
          accountId: input.accountId,
          externalId: input.externalId,
        },
      },
    });

  if (existing) {
    return prisma.conversation.update({
      where: {
        id: existing.id,
      },
      data: {
        lastActivity: new Date(),
      },
    });
  }

  return prisma.conversation.create({
    data: {
      userId: input.userId,
      accountId: input.accountId,
      externalId: input.externalId,
      title: input.title ?? input.externalId,
      mode: CONVERSATION_MODES.AI_ACTIVE,
      aiEnabled: true,
      lastActivity: new Date(),
    },
  });
}

export async function setConversationMode(
  conversationId: string,
  mode: ConversationMode,
) {
  const conversation =
    await prisma.conversation.findUnique({
      where: {
        id: conversationId,
      },
      select: {
        id: true,
        mode: true,
      },
    });

  if (!conversation) {
    throw new Error(
      "CONVERSATION_NOT_FOUND",
    );
  }

  const updated =
    await prisma.conversation.update({
      where: {
        id: conversationId,
      },
      data: {
        mode,
        aiEnabled:
          mode === CONVERSATION_MODES.AI_ACTIVE,
        lastActivity: new Date(),
      },
      select: {
        id: true,
        mode: true,
        aiEnabled: true,
        lastActivity: true,
      },
    });

  return {
    conversationId: updated.id,
    mode: updated.mode,
    aiEnabled: updated.aiEnabled,
    previous: conversation.mode,
    lastActivity: updated.lastActivity,
  };
}

export async function setConversationAiEnabled(
  conversationId: string,
  enabled: boolean,
) {
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

  return prisma.conversation.update({
    where: {
      id: conversationId,
    },
    data: {
      aiEnabled: enabled,
      mode: enabled
        ? CONVERSATION_MODES.AI_ACTIVE
        : CONVERSATION_MODES.AI_PAUSED,
      lastActivity: new Date(),
    },
  });
}

export function shouldAiReply(
  mode: ConversationMode,
  aiEnabled = true,
): boolean {
  return (
    mode === CONVERSATION_MODES.AI_ACTIVE &&
    aiEnabled
  );
}

export function isHumanActive(
  mode: ConversationMode,
): boolean {
  return (
    mode === CONVERSATION_MODES.HUMAN_ACTIVE
  );
}
