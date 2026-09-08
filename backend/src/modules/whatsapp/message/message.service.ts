import { prisma } from "../../../lib/prisma.js";

export async function saveInboundMessage(input: {
  accountId: string;
  externalMessageId: string;
  messageType: string;
  fromNumber?: string;
  text?: string;
  mediaId?: string;
  rawMetadata?: unknown;
}) {
  return prisma.whatsAppMessage.upsert({
    where: {
      externalMessageId:
        input.externalMessageId,
    },
    create: {
      accountId: input.accountId,
      externalMessageId:
        input.externalMessageId,
      direction: "INBOUND",
      messageType: input.messageType,
      fromNumber: input.fromNumber,
      text: input.text,
      mediaId: input.mediaId,
      rawMetadata:
        input.rawMetadata as object | undefined,
      status: "RECEIVED",
    },
    update: {},
  });
}

export async function listMessages(
  accountId: string,
) {
  return prisma.whatsAppMessage.findMany({
    where: {
      accountId,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 100,
  });
}
