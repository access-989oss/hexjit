import { prisma } from "../../../lib/prisma.js";

export async function listWhatsAppGroups(
  accountId: string,
) {
  return prisma.whatsAppGroup.findMany({
    where: {
      accountId,
    },
  });
}

export async function getWhatsAppGroupsForAccount(
  accountId: string,
) {
  return prisma.whatsAppGroup.findMany({
    where: {
      accountId,
    },
  });
}
