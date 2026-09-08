import { prisma } from "../../../lib/prisma.js";
import {
  normalizeMetaWebhookMessages,
} from "./whatsapp.normalizer.js";

function normalizeTimestamp(
  timestamp?: string,
) {
  if (!timestamp) {
    return undefined;
  }

  const seconds = Number(timestamp);

  if (!Number.isFinite(seconds)) {
    return undefined;
  }

  const date = new Date(
    seconds * 1000,
  );

  return Number.isNaN(date.getTime())
    ? undefined
    : date;
}

export async function processNormalizedMessages(
  accountId: string,
  payload: unknown,
) {
  const normalized =
    normalizeMetaWebhookMessages(
      accountId,
      payload,
    );

  const saved = [];

  for (const message of normalized) {
    const record =
      await prisma.whatsAppMessage.upsert({
        where: {
          externalMessageId:
            message.externalMessageId,
        },
        create: {
          accountId,
          externalMessageId:
            message.externalMessageId,
          direction: "INBOUND",
          messageType: message.type,
          fromNumber:
            message.fromNumber,
          text: message.text,
          mediaId: message.mediaId,
          status: "RECEIVED",
          rawMetadata: {
            mimeType: message.mimeType,
            fileName: message.fileName,
            caption: message.caption,
            latitude: message.latitude,
            longitude: message.longitude,
            timestamp:
              message.timestamp,
          },
          createdAt:
            normalizeTimestamp(
              message.timestamp,
            ) ?? new Date(),
        },
        update: {},
      });

    saved.push(record);
  }

  if (normalized.length > 0) {
    await prisma.whatsAppAccount.update({
      where: {
        id: accountId,
      },
      data: {
        lastWebhookAt: new Date(),
        lastMessageAt: new Date(),
      },
    });
  }

  return {
    received: normalized.length,
    saved,
  };
}
