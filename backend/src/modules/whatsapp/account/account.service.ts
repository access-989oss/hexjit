import { prisma } from "../../../lib/prisma.js";
import { WhatsAppStatus } from "../../../generated/prisma/client.js";
import {
  encryptWhatsAppSecret,
  decryptWhatsAppSecret,
} from "../crypto/whatsapp-crypto.js";

export async function listWhatsAppAccounts(
  userId: string,
) {
  return prisma.whatsAppAccount.findMany({
    where: {
      userId,
    },
    orderBy: {
      createdAt: "asc",
    },
  });
}

export async function createWhatsAppAccount(data: {
  userId: string;
  phoneNumberId: string;
  accessToken: string;
}) {
  const accessTokenEnc =
    encryptWhatsAppSecret(data.accessToken);

  return prisma.whatsAppAccount.create({
    data: {
      userId: data.userId,
      phoneNumberId: data.phoneNumberId,
      accessTokenEnc,
    },
  });
}

export async function getWhatsAppAccountSecret(
  id: string,
) {
  const account =
    await prisma.whatsAppAccount.findUnique({
      where: {
        id,
      },
    });

  if (!account) {
    return null;
  }

  if (!account.accessTokenEnc) {
    return {
      id: account.id,
      phoneNumberId: account.phoneNumberId,
      accessToken: null,
    };
  }

  return {
    id: account.id,
    phoneNumberId: account.phoneNumberId,
    accessToken:
      decryptWhatsAppSecret(
        account.accessTokenEnc,
      ),
  };
}

export async function updateWhatsAppStatus(
  id: string,
  status: WhatsAppStatus,
) {
  return prisma.whatsAppAccount.update({
    where: {
      id,
    },
    data: {
      status,
    },
  });
}
