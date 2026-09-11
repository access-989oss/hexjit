import { prisma } from "../../../lib/prisma.js";

import {
  getOrCreateConversation,
} from "../../conversations/conversation.service.js";

import {
  decideConversationAction,
} from "../../conversations/decision.service.js";

import {
  filterIncomingMessage,
} from "../../message-filter/filter.service.js";

import {
  loadUserAutomations,
  executePersistentAutomations,
} from "../../automation/index.js";

import {
  buildSystemPrompt,
} from "../../persona/context-builder.service.js";

import type {
  PersonaProfile,
} from "../../persona/persona.types.js";

import {
  executeProductionAiReply,
} from "../../automation/runtime/production-ai-reply.service.js";

import {
  scheduleFollowUp as scheduleFollowUpJob,
} from "../../scheduler/index.js";

import {
  sendWhatsAppTextMessage,
} from "../message/outbound.service.js";

import {
  saveOutboundMessage,
} from "../message/outbound-record.service.js";

import type {
  WhatsAppNormalizedMessage,
} from "../normalizer/whatsapp.types.js";

function parseFollowUpDelay(
  config: Record<string, unknown>,
): number {
  const candidates: Array<[unknown, number]> = [
    [config.delayMs, 1],
    [config.seconds, 1000],
    [config.minutes, 60 * 1000],
    [config.hours, 60 * 60 * 1000],
  ];

  for (const [value, multiplier] of candidates) {
    if (
      typeof value === "number" &&
      Number.isFinite(value) &&
      value >= 0
    ) {
      return value * multiplier;
    }
  }

  return 60 * 60 * 1000;
}

function toImportance(
  value: number,
): "low" | "medium" | "high" {
  if (value >= 67) {
    return "high";
  }

  if (value >= 34) {
    return "medium";
  }

  return "low";
}

function toVocabulary(
  value: string | null | undefined,
): "advanced" | "normal" | "simple" {
  if (value === "advanced") return "advanced";
  if (value === "simple") return "simple";
  return "normal";
}

function toTone(
  value: string | null | undefined,
): "casual" | "friendly" | "professional" | "formal" | "neutral" {
  switch (value) {
    case "casual":
      return "casual";
    case "professional":
      return "professional";
    case "formal":
      return "formal";
    case "neutral":
      return "neutral";
    default:
      return "friendly";
  }
}

function toHumor(
  value: string | null | undefined,
): "none" | "light" | "frequent" {
  if (value === "none") return "none";
  if (value === "frequent") return "frequent";
  return "light";
}

function toEmojiLevel(
  value: string | null | undefined,
): "none" | "low" | "medium" | "high" {
  if (value === "none") return "none";
  if (value === "medium") return "medium";
  if (value === "high") return "high";
  return "low";
}

function toSentenceLength(
  value: string | null | undefined,
): "short" | "medium" | "long" {
  if (value === "short") return "short";
  if (value === "long") return "long";
  return "medium";
}

function buildTriggerType(
  message: WhatsAppNormalizedMessage,
): string {
  switch (message.type) {
    case "image":
      return "IMAGE";

    case "audio":
      return "VOICE";

    case "document":
      return "FILE";

    default:
      return "NEW_MESSAGE";
  }
}

async function loadPersonaContext(
  userId: string,
  externalContact: string,
) {
  const [
    persona,
    memories,
    contactPreference,
  ] = await Promise.all([
    prisma.persona.findUnique({
      where: {
        userId,
      },
    }),

    prisma.memory.findMany({
      where: {
        userId,
        enabled: true,
      },
      orderBy: [
        {
          importance: "desc",
        },
        {
          updatedAt: "desc",
        },
      ],
      take: 20,
    }),

    prisma.contactPreference.findUnique({
      where: {
        userId_externalContact: {
          userId,
          externalContact,
        },
      },
    }),
  ]);

  const communicationRules = Array.isArray(
    persona?.rules,
  )
    ? persona.rules.filter(
        (item): item is string =>
          typeof item === "string",
      )
    : [];

  const personaProfile: PersonaProfile = {
    language:
      contactPreference?.language ??
      persona?.language ??
      "English",

    vocabulary:
      toVocabulary(
        persona?.vocabulary,
      ),

    tone:
      toTone(
        contactPreference?.tone ??
        persona?.tone,
      ),

    humor:
      toHumor(
        persona?.humorStyle,
      ),

    emojiLevel:
      toEmojiLevel(
        persona?.emojiStyle,
      ),

    sentenceLength:
      toSentenceLength(
        persona?.responseLength,
      ),

    greetings: [],

    closings: [],

    communicationRules,

    behaviorWithFriends:
      contactPreference?.relationship ===
      "friend"
        ? "Be natural, warm, and casual."
        : undefined,

    behaviorWithCustomers:
      contactPreference?.relationship ===
      "customer"
        ? "Be helpful, respectful, and professional."
        : undefined,

    behaviorWithStrangers:
      contactPreference?.relationship ===
      "stranger"
        ? "Be polite and neutral."
        : undefined,
  };

  const memoryItems = memories.map(
    (memory) => ({
      id: memory.id,
      fact: memory.content,
      importance: toImportance(
        memory.importance,
      ),
    }),
  );

  return {
    persona: personaProfile,
    memories: memoryItems,
    contactPreference,
  };
}

async function loadRecentMessages(
  conversationId: string,
) {
  const messages =
    await prisma.message.findMany({
      where: {
        conversationId,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 20,
    });

  return messages.reverse().map(
    (message) => ({
      role:
        message.direction === "OUTBOUND"
          ? ("assistant" as const)
          : ("user" as const),

      content:
        message.contentHash?.trim() ||
        `[${message.messageType} message]`,
    }),
  );
}

async function persistConversationMessage(
  input: {
    conversationId: string;
    externalId: string;
    direction:
      | "INBOUND"
      | "OUTBOUND";
    messageType: string;
    text?: string;
    createdAt?: Date;
  },
) {
  return prisma.message.upsert({
    where: {
      externalId:
        input.externalId,
    },

    create: {
      conversationId:
        input.conversationId,

      externalId:
        input.externalId,

      direction:
        input.direction,

      messageType:
        input.messageType,

      contentHash:
        input.text?.trim() ||
        null,

      createdAt:
        input.createdAt ??
        new Date(),
    },

    update: {},
  });
}

async function handleAiReply(
  input: {
    userId: string;
    accountId: string;
    conversationId: string;
    recipientPhone: string;
    text?: string;
    externalMessageId: string;
  },
) {
  const replyText =
    input.text?.trim();

  if (!replyText) {
    throw new Error(
      "AI_REPLY_TEXT_REQUIRED",
    );
  }

  const context =
    await loadPersonaContext(
      input.userId,
      input.recipientPhone,
    );

  const recentMessages =
    await loadRecentMessages(
      input.conversationId,
    );

  const systemPrompt =
    buildSystemPrompt({
      persona:
        context.persona,

      memories:
        context.memories,

      contactOverride:
        context.contactPreference
          ? {
              contactId:
                context.contactPreference
                  .externalContact,

              language:
                context.contactPreference
                  .language ??
                undefined,

              tone:
                context.contactPreference.tone
                  ? toTone(
                      context.contactPreference.tone,
                    )
                  : undefined,

              emojiLevel:
                undefined,

              sentenceLength:
                undefined,

              communicationRules: [],
            }
          : undefined,
    });

  const aiResult =
    await executeProductionAiReply({
      userId:
        input.userId,

      prompt:
        replyText,

      systemPrompt,

      messages: [
        ...recentMessages,
        {
          role: "user",
          content: replyText,
        },
      ],

      metadata: {
        accountId:
          input.accountId,

        conversationId:
          input.conversationId,

        recipientPhone:
          input.recipientPhone,

        externalMessageId:
          input.externalMessageId,
      },
    });

  const responseText =
    aiResult.content?.trim();

  if (!responseText) {
    throw new Error(
      "AI_EMPTY_RESPONSE",
    );
  }

  const response =
    await sendWhatsAppTextMessage({
      accountId:
        input.accountId,

      recipientPhone:
        input.recipientPhone,

      text:
        responseText,
    });

  const body =
    response as {
      messages?: Array<{
        id?: string;
      }>;
    };

  const externalId =
    body.messages?.[0]?.id ??
    `local-${Date.now()}`;

  await saveOutboundMessage({
    accountId:
      input.accountId,

    externalMessageId:
      externalId,

    recipientPhone:
      input.recipientPhone,

    text:
      responseText,

    status:
      "SENT",
  });

  await persistConversationMessage({
    conversationId:
      input.conversationId,

    externalId,

    direction:
      "OUTBOUND",

    messageType:
      "text",

    text:
      responseText,
  });

  return {
    content:
      responseText,

    externalMessageId:
      externalId,

    providerId:
      aiResult.providerId,

    modelId:
      aiResult.modelId,
  };
}

export async function processInboundMessage(
  message: WhatsAppNormalizedMessage,
) {
  const fromNumber =
    message.fromNumber?.trim();

  if (!fromNumber) {
    throw new Error(
      "WHATSAPP_SENDER_NUMBER_REQUIRED",
    );
  }

  const account =
    await prisma.whatsAppAccount.findUnique({
      where: {
        id: message.accountId,
      },

      select: {
        id: true,
        userId: true,
        aiEnabled: true,
        status: true,
      },
    });

  if (!account) {
    throw new Error(
      "WHATSAPP_ACCOUNT_NOT_FOUND",
    );
  }

  if (!account.aiEnabled) {
    return {
      handled: false,
      reason: "ACCOUNT_AI_DISABLED",
    };
  }

  const contact =
    await prisma.whatsAppContact.upsert({
      where: {
        accountId_waId: {
          accountId:
            account.id,

          waId:
            fromNumber,
        },
      },

      create: {
        accountId:
          account.id,

        waId:
          fromNumber,

        phoneNumber:
          fromNumber,
      },

      update: {},
    });

  const conversation =
    await getOrCreateConversation({
      userId:
        account.userId,

      accountId:
        account.id,

      externalId:
        fromNumber,

      title:
        fromNumber,
    });

  const messageText =
    message.text?.trim() ||
    message.caption?.trim() ||
    "";

  await persistConversationMessage({
    conversationId:
      conversation.id,

    externalId:
      message.externalMessageId,

    direction:
      "INBOUND",

    messageType:
      message.type,

    text:
      messageText ||
      undefined,

    createdAt:
      message.timestamp &&
      Number.isFinite(
        Number(message.timestamp),
      )
        ? new Date(
            Number(message.timestamp) *
              1000,
          )
        : new Date(),
  });

  const preference =
    await prisma.contactPreference.findUnique({
      where: {
        userId_externalContact: {
          userId:
            account.userId,

          externalContact:
            fromNumber,
        },
      },
    });

  const filtered =
    filterIncomingMessage({
      text:
        messageText,

      explicitlyIgnored:
        preference?.ignored ??
        false,

      trustedContact:
        preference?.trusted ??
        false,
    });

  const decision =
    decideConversationAction({
      mode:
        conversation.mode,

      contactIgnored:
        preference?.ignored ??
        false,

      messageFilterAction:
        filtered.action,
    });

  if (
    !decision.shouldReply ||
    !decision.shouldRunAutomation
  ) {
    return {
      handled: false,
      reason:
        decision.reason,

      contactId:
        contact.id,

      conversationId:
        conversation.id,
    };
  }

  const automations =
    await loadUserAutomations(
      account.userId,
    );

  if (automations.length === 0) {
    return {
      handled: false,
      reason: "NO_AUTOMATION",

      contactId:
        contact.id,

      conversationId:
        conversation.id,
    };
  }

  const event = {
    type:
      buildTriggerType(message),

    userId:
      account.userId,

    accountId:
      account.id,

    conversationId:
      conversation.id,

    contactId:
      contact.id,

    text:
      messageText ||
      undefined,

    messageId:
      message.externalMessageId,

    metadata: {
      recipientPhone:
        fromNumber,

      externalMessageId:
        message.externalMessageId,

      messageType:
        message.type,

      mediaId:
        message.mediaId,
    },
  };

  const automationRuntime =
    await executePersistentAutomations(
      automations,
      event,

      {
        sendText: async (
          recipientPhone,
          text,
        ) => {
          const cleanText =
            text.trim();

          if (!cleanText) {
            throw new Error(
              "WHATSAPP_MESSAGE_EMPTY",
            );
          }

          const response =
            await sendWhatsAppTextMessage({
              accountId:
                account.id,

              recipientPhone,

              text:
                cleanText,
            });

          const body =
            response as {
              messages?: Array<{
                id?: string;
              }>;
            };

          const externalId =
            body.messages?.[0]?.id ??
            `local-${Date.now()}`;

          await saveOutboundMessage({
            accountId:
              account.id,

            externalMessageId:
              externalId,

            recipientPhone,

            text:
              cleanText,

            status:
              "SENT",
          });

          await persistConversationMessage({
            conversationId:
              conversation.id,

            externalId,

            direction:
              "OUTBOUND",

            messageType:
              "text",

            text:
              cleanText,
          });

          return response;
        },

        aiReply: async (
          actionConfig,
        ) => {
          const configuredPrompt =
            typeof actionConfig.prompt ===
            "string"
              ? actionConfig.prompt.trim()
              : "";

          return handleAiReply({
            userId:
              account.userId,

            accountId:
              account.id,

            conversationId:
              conversation.id,

            recipientPhone:
              fromNumber,

            text:
              configuredPrompt ||
              messageText,

            externalMessageId:
              message.externalMessageId,
          });
        },

        sendImage: async () => {
          throw new Error(
            "SEND_IMAGE_RUNTIME_NOT_CONNECTED",
          );
        },

        analyzeImage: async () => {
          throw new Error(
            "ANALYZE_IMAGE_RUNTIME_NOT_CONNECTED",
          );
        },

        scheduleFollowUp: async (actionConfig) => {
          const delayMs =
            parseFollowUpDelay(actionConfig);

          const message =
            typeof actionConfig.message === "string"
              ? actionConfig.message.trim()
              : "";

          return scheduleFollowUpJob(
            {
              userId: account.userId,
              accountId: account.id,
              recipientPhone: fromNumber,
              message,
              metadata: {
                conversationId: conversation.id,
                contactId: contact.id,
              },
            },
            delayMs,
          );
        },
      },
    );

  return {
    handled:
      automationRuntime.matchedCount >
      0,

    reason:
      "AUTOMATION_EXECUTED",

    contactId:
      contact.id,

    conversationId:
      conversation.id,

    automation:
      automationRuntime,
  };
}
