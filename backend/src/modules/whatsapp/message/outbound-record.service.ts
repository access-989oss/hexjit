import { prisma } from "../../../lib/prisma.js";

export async function saveOutboundMessage(input: {
  accountId: string;
  externalMessageId: string;
  recipientPhone: string;
  text: string;
  status?: string;
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
      direction: "OUTBOUND",
      messageType: "text",
      toNumber:
        input.recipientPhone,
      text: input.text,
      status:
        input.status ?? "SENT",
    },
    update: {},
  });
}
