import { prisma } from "../../../lib/prisma.js";

/**
 * Load the previous inbound message text for the same conversation.
 *
 * Message.contentHash is the field name but stores the actual text.
 * We exclude the current message to avoid returning the message that
 * triggered this automation.
 */
export async function loadPreviousMessage(input: {
  conversationId?: string;
  currentExternalMessageId?: string;
}): Promise<string | undefined> {
  if (!input.conversationId) {
    return undefined;
  }

  const message = await prisma.message.findFirst({
    where: {
      conversationId: input.conversationId,
      direction: "INBOUND",
      ...(input.currentExternalMessageId
        ? { externalId: { not: input.currentExternalMessageId } }
        : {}),
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      contentHash: true,
    },
  });

  const text = message?.contentHash?.trim();

  return text && text.length > 0 ? text : undefined;
}

const INTENT_RULES: Array<{
  intent: string;
  keywords: string[];
}> = [
  {
    intent: "PRICING",
    keywords: [
      "price",
      "pricing",
      "cost",
      "rate",
      "charge",
      "kitna",
      "kitne",
      "kitni",
    ],
  },
  {
    intent: "SUPPORT",
    keywords: [
      "help",
      "support",
      "problem",
      "issue",
      "madad",
      "dikkat",
      "samasya",
    ],
  },
  {
    intent: "ORDER",
    keywords: [
      "order",
      "buy",
      "purchase",
      "chahiye",
      "kharidna",
      "book",
    ],
  },
  {
    intent: "GREETING",
    keywords: [
      "hello",
      "hii",
      "hey",
      "namaste",
      "namaskar",
    ],
  },
  {
    intent: "GRATITUDE",
    keywords: [
      "thanks",
      "thank you",
      "dhanyavad",
      "shukriya",
    ],
  },
];

/**
 * Very fast intent classifier — keyword-based, no AI cost.
 * Returns undefined for empty text, "OTHER" for unknown text.
 */
export function classifyIntent(
  text?: string,
): string | undefined {
  if (!text?.trim()) {
    return undefined;
  }

  const lower = text.toLowerCase();

  for (const rule of INTENT_RULES) {
    for (const keyword of rule.keywords) {
      if (lower.includes(keyword)) {
        return rule.intent;
      }
    }
  }

  return "OTHER";
}
