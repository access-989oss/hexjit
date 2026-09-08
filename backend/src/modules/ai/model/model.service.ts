import { prisma } from "../../../lib/prisma.js";
import { Prisma } from "../../../generated/prisma/client.js";

export async function listModels(
  providerId?: string,
) {
  return prisma.aiModel.findMany({
    where: providerId
      ? { providerId }
      : undefined,
    orderBy: [
      {
        capability: "asc",
      },
      {
        createdAt: "asc",
      },
    ],
    select: {
      id: true,
      providerId: true,
      model: true,
      displayName: true,
      capability: true,
      isEnabled: true,
      isDefault: true,
      metadata: true,
      createdAt: true,
      updatedAt: true,
      provider: {
        select: {
          id: true,
          name: true,
          slug: true,
          protocol: true,
        },
      },
    },
  });
}

export async function createModel(data: {
  providerId: string;
  model: string;
  displayName?: string;
  capability: string;
  isEnabled: boolean;
  isDefault: boolean;
  metadata?: Prisma.InputJsonValue;
}) {
  const provider =
    await prisma.aiProvider.findUnique({
      where: {
        id: data.providerId,
      },
    });

  if (!provider) {
    throw new Error(
      "AI_PROVIDER_NOT_FOUND",
    );
  }

  if (data.isDefault) {
    await prisma.aiModel.updateMany({
      where: {
        providerId: data.providerId,
        capability: data.capability,
        isDefault: true,
      },
      data: {
        isDefault: false,
      },
    });
  }

  return prisma.aiModel.create({
    data: {
      providerId: data.providerId,
      model: data.model,
      displayName:
        data.displayName ?? null,
      capability: data.capability,
      isEnabled: data.isEnabled,
      isDefault: data.isDefault,
      ...(data.metadata !== undefined
        ? { metadata: data.metadata }
        : {}),
    },
    select: {
      id: true,
      providerId: true,
      model: true,
      displayName: true,
      capability: true,
      isEnabled: true,
      isDefault: true,
      metadata: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function updateModel(
  id: string,
  data: {
    model?: string;
    displayName?: string;
    capability?: string;
    isEnabled?: boolean;
    isDefault?: boolean;
    metadata?: Prisma.InputJsonValue;
  },
) {
  const existing =
    await prisma.aiModel.findUnique({
      where: { id },
    });

  if (!existing) {
    return null;
  }

  if (data.isDefault === true) {
    await prisma.aiModel.updateMany({
      where: {
        providerId: existing.providerId,
        capability:
          data.capability ??
          existing.capability,
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

  return prisma.aiModel.update({
    where: { id },
    data: {
      ...(data.model !== undefined
        ? { model: data.model }
        : {}),
      ...(data.displayName !== undefined
        ? { displayName: data.displayName }
        : {}),
      ...(data.capability !== undefined
        ? { capability: data.capability }
        : {}),
      ...(data.isEnabled !== undefined
        ? { isEnabled: data.isEnabled }
        : {}),
      ...(data.isDefault !== undefined
        ? { isDefault: data.isDefault }
        : {}),
      ...(data.metadata !== undefined
        ? { metadata: data.metadata }
        : {}),
    },
    select: {
      id: true,
      providerId: true,
      model: true,
      displayName: true,
      capability: true,
      isEnabled: true,
      isDefault: true,
      metadata: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function deleteModel(
  id: string,
) {
  try {
    await prisma.aiModel.delete({
      where: { id },
    });
    return true;
  } catch {
    return false;
  }
}
