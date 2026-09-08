import { prisma } from "../../../lib/prisma.js";
import {
  encryptSecret,
  decryptSecret,
} from "../../../security/ai-crypto.js";

export async function listProviders() {
  const providers =
    await prisma.aiProvider.findMany({
      orderBy: {
        createdAt: "asc",
      },
      include: {
        models: {
          orderBy: {
            createdAt: "asc",
          },
          select: {
            id: true,
            model: true,
            displayName: true,
            capability: true,
            isEnabled: true,
            isDefault: true,
            metadata: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

  return providers.map((provider) => ({
    id: provider.id,
    name: provider.name,
    slug: provider.slug,
    protocol: provider.protocol,
    baseUrl: provider.baseUrl,
    isEnabled: provider.isEnabled,
    isDefault: provider.isDefault,
    apiKeyConfigured:
      Boolean(provider.apiKeyEncrypted),
    createdAt: provider.createdAt,
    updatedAt: provider.updatedAt,
    models: provider.models,
  }));
}

export async function getProviderById(
  id: string,
) {
  const provider =
    await prisma.aiProvider.findUnique({
      where: {
        id,
      },
    });

  if (!provider) {
    return null;
  }

  return {
    id: provider.id,
    name: provider.name,
    slug: provider.slug,
    protocol: provider.protocol,
    baseUrl: provider.baseUrl,
    isEnabled: provider.isEnabled,
    isDefault: provider.isDefault,
    apiKeyConfigured:
      Boolean(provider.apiKeyEncrypted),
    createdAt: provider.createdAt,
    updatedAt: provider.updatedAt,
  };
}

export async function createProvider(data: {
  name: string;
  slug: string;
  protocol: string;
  baseUrl: string;
  apiKey: string;
  isEnabled: boolean;
  isDefault: boolean;
}) {
  if (data.isDefault) {
    await prisma.aiProvider.updateMany({
      where: {
        isDefault: true,
      },
      data: {
        isDefault: false,
      },
    });
  }

  const encryptedKey =
    encryptSecret(data.apiKey);

  const provider =
    await prisma.aiProvider.create({
      data: {
        name: data.name,
        slug: data.slug,
        protocol: data.protocol,
        baseUrl: data.baseUrl,
        apiKeyEncrypted: encryptedKey,
        isEnabled: data.isEnabled,
        isDefault: data.isDefault,
      },
    });

  return {
    id: provider.id,
    name: provider.name,
    slug: provider.slug,
    protocol: provider.protocol,
    baseUrl: provider.baseUrl,
    isEnabled: provider.isEnabled,
    isDefault: provider.isDefault,
    apiKeyConfigured: true,
    createdAt: provider.createdAt,
    updatedAt: provider.updatedAt,
  };
}

export async function updateProvider(
  id: string,
  data: {
    name?: string;
    slug?: string;
    protocol?: string;
    baseUrl?: string;
    apiKey?: string;
    isEnabled?: boolean;
    isDefault?: boolean;
  },
) {
  const existing =
    await prisma.aiProvider.findUnique({
      where: { id },
    });

  if (!existing) {
    return null;
  }

  if (data.isDefault === true) {
    await prisma.aiProvider.updateMany({
      where: {
        id: {
          not: id,
        },
        isDefault: true,
      },
      data: {
        isDefault: false,
      },
    });
  }

  const updateData: Record<
    string,
    unknown
  > = {};

  if (data.name !== undefined) {
    updateData.name = data.name;
  }

  if (data.slug !== undefined) {
    updateData.slug = data.slug;
  }

  if (data.protocol !== undefined) {
    updateData.protocol = data.protocol;
  }

  if (data.baseUrl !== undefined) {
    updateData.baseUrl = data.baseUrl;
  }

  if (data.isEnabled !== undefined) {
    updateData.isEnabled =
      data.isEnabled;
  }

  if (data.isDefault !== undefined) {
    updateData.isDefault =
      data.isDefault;
  }

  if (data.apiKey !== undefined) {
    updateData.apiKeyEncrypted =
      encryptSecret(data.apiKey);
  }

  const provider =
    await prisma.aiProvider.update({
      where: { id },
      data: updateData,
    });

  return {
    id: provider.id,
    name: provider.name,
    slug: provider.slug,
    protocol: provider.protocol,
    baseUrl: provider.baseUrl,
    isEnabled: provider.isEnabled,
    isDefault: provider.isDefault,
    apiKeyConfigured: true,
    createdAt: provider.createdAt,
    updatedAt: provider.updatedAt,
  };
}

export async function deleteProvider(
  id: string,
) {
  const provider =
    await prisma.aiProvider.findUnique({
      where: { id },
    });

  if (!provider) {
    return false;
  }

  await prisma.$transaction([
    prisma.aiRoute.updateMany({
      where: {
        providerId: id,
      },
      data: {
        providerId: null,
        modelId: null,
      },
    }),
    prisma.aiProvider.delete({
      where: { id },
    }),
  ]);

  return true;
}

export async function getProviderSecret(
  id: string,
) {
  const provider =
    await prisma.aiProvider.findUnique({
      where: { id },
      select: {
        id: true,
        baseUrl: true,
        protocol: true,
        apiKeyEncrypted: true,
      },
    });

  if (!provider) {
    return null;
  }

  return {
    id: provider.id,
    baseUrl: provider.baseUrl,
    protocol: provider.protocol,
    apiKey: decryptSecret(
      provider.apiKeyEncrypted,
    ),
  };
}
