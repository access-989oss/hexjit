import { processInboundMessage } from "../runtime/index.js";
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

    if (
      !message.externalMessageId
    ) {
      continue;
    }

    /*
     * Idempotency gate:
     * - PROCESSED => already completed, never execute again.
     * - PROCESSING => another worker/webhook owns it.
     * - FAILED => allow retry.
     * - RECEIVED => claim it atomically.
     */
    const currentStatus =
      record.status ?? "RECEIVED";

    if (
      currentStatus === "PROCESSED" ||
      currentStatus === "PROCESSING"
    ) {
      continue;
    }

    const claim =
      await prisma.whatsAppMessage.updateMany({
        where: {
          externalMessageId:
            message.externalMessageId,
          OR: [
            {
              status: "RECEIVED",
            },
            {
              status: "FAILED",
            },
            {
              status: null,
            },
          ],
        },
        data: {
          status: "PROCESSING",
          updatedAt: new Date(),
        },
      });

    if (claim.count !== 1) {
      continue;
    }

    try {
      await processInboundMessage(
        message,
      );

      await prisma.whatsAppMessage.update({
        where: {
          externalMessageId:
            message.externalMessageId,
        },
        data: {
          status: "PROCESSED",
        },
      });
    } catch (error) {
      await prisma.whatsAppMessage.update({
        where: {
          externalMessageId:
            message.externalMessageId,
        },
        data: {
          status: "FAILED",
          rawMetadata: {
            ...(typeof record.rawMetadata === "object" &&
            record.rawMetadata !== null
              ? record.rawMetadata as Record<string, unknown>
              : {}),
            processingError:
              error instanceof Error
                ? error.message
                : String(error),
            failedAt:
              new Date().toISOString(),
          },
        },
      });

      console.error(
        "[whatsapp] inbound runtime failed",
        {
          accountId,
          externalMessageId:
            message.externalMessageId,
          error:
            error instanceof Error
              ? error.message
              : String(error),
        },
      );

      throw error;
    }
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
