import { prisma } from "../../../lib/prisma.js";

export async function upsertWhatsAppContact(input: {
  accountId: string;
  waId: string;
  phoneNumber?: string;
}) {
  const existing =
    await prisma.whatsAppContact.findFirst({
      where: {
        accountId: input.accountId,
        waId: input.waId,
      },
    });

  if (existing) {
    return existing;
  }

  return prisma.whatsAppContact.create({
    data: {
      accountId: input.accountId,
      waId: input.waId,
      phoneNumber:
        input.phoneNumber ?? input.waId,
    },
  });
}

export async function getWhatsAppContact(
  accountId: string,
  waId: string,
) {
  return prisma.whatsAppContact.findFirst({
    where: {
      accountId,
      waId,
    },
  });
}

export async function listWhatsAppContacts(
  accountId: string,
) {
  return prisma.whatsAppContact.findMany({
    where: {
      accountId,
    },
  });
}
