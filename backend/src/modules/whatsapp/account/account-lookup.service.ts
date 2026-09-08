import { prisma } from "../../../lib/prisma.js";

export async function findWhatsAppAccountByPhoneNumberId(
  phoneNumberId: string,
) {
  return prisma.whatsAppAccount.findFirst({
    where: {
      phoneNumberId,
      isEnabled: true,
    },
  });
}

export async function findWhatsAppAccountForUser(
  userId: string,
) {
  return prisma.whatsAppAccount.findFirst({
    where: {
      userId,
      isEnabled: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });
}
