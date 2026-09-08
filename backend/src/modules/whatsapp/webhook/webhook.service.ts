import { prisma } from "../../../lib/prisma.js";

export async function saveWebhookEvent(input: {
  eventId: string;
  accountId?: string;
  eventType: string;
  payload: unknown;
}) {
  return prisma.whatsAppWebhookEvent.upsert({
    where: {
      eventId: input.eventId,
    },
    create: {
      eventId: input.eventId,
      accountId: input.accountId,
      eventType: input.eventType,
      payload:
        input.payload as object,
    },
    update: {},
  });
}

export async function markWebhookProcessed(
  eventId: string,
) {
  return prisma.whatsAppWebhookEvent.update({
    where: {
      eventId,
    },
    data: {
      processed: true,
      processedAt: new Date(),
      errorMessage: null,
    },
  });
}

export async function markWebhookFailed(
  eventId: string,
  errorMessage: string,
) {
  return prisma.whatsAppWebhookEvent.update({
    where: {
      eventId,
    },
    data: {
      processed: false,
      errorMessage,
    },
  });
}
