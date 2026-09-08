import { prisma } from "../../../lib/prisma.js";
import {
  encryptWhatsAppSecret,
} from "../crypto/whatsapp-crypto.js";
import {
  testWhatsAppConnection,
} from "../api/meta-whatsapp.client.js";

export async function listAdminWhatsAppAccounts() {
  return prisma.whatsAppAccount.findMany({
    orderBy: {
      createdAt: "asc",
    },
    select: {
      id: true,
      userId: true,
      phoneNumber: true,
      businessId: true,
      phoneNumberId: true,
      status: true,
      connectedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function configureWhatsAppAccount(
  input: {
    userId: string;
    phoneNumber?: string;
    businessId?: string;
    phoneNumberId: string;
    accessToken: string;
  },
) {
  const encryptedToken =
    encryptWhatsAppSecret(
      input.accessToken,
    );

  const existing =
    await prisma.whatsAppAccount.findFirst({
      where: {
        phoneNumberId:
          input.phoneNumberId,
      },
    });

  if (existing) {
    return prisma.whatsAppAccount.update({
      where: {
        id: existing.id,
      },
      data: {
        userId: input.userId,
        phoneNumber:
          input.phoneNumber,
        businessId:
          input.businessId,
        phoneNumberId:
          input.phoneNumberId,
        accessTokenEnc:
          encryptedToken,
      },
      select: {
        id: true,
        userId: true,
        phoneNumber: true,
        businessId: true,
        phoneNumberId: true,
        status: true,
        connectedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  return prisma.whatsAppAccount.create({
    data: {
      userId: input.userId,
      phoneNumber:
        input.phoneNumber,
      businessId:
        input.businessId,
      phoneNumberId:
        input.phoneNumberId,
      accessTokenEnc:
        encryptedToken,
    },
    select: {
      id: true,
      userId: true,
      phoneNumber: true,
      businessId: true,
      phoneNumberId: true,
      status: true,
      connectedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function testConfiguredWhatsApp(
  accountId: string,
) {
  return testWhatsAppConnection(
    accountId,
  );
}
