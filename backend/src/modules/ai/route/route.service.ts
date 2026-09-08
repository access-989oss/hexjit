import { prisma } from "../../../lib/prisma.js";

export async function listRoutes() {
  return prisma.aiRoute.findMany({
    orderBy: [
      {
        capability: "asc",
      },
      {
        priority: "asc",
      },
    ],
  });
}

export async function upsertRoute(data: {
  capability: string;
  providerId?: string | null;
  modelId?: string | null;
  priority: number;
  isEnabled: boolean;
  fallback: boolean;
}) {
  const existing =
    await prisma.aiRoute.findFirst({
      where: {
        capability: data.capability,
        priority: data.priority,
        fallback: data.fallback,
      },
    });

  if (existing) {
    return prisma.aiRoute.update({
      where: {
        id: existing.id,
      },
      data,
    });
  }

  return prisma.aiRoute.create({
    data,
  });
}

export async function deleteRoute(
  id: string,
) {
  try {
    await prisma.aiRoute.delete({
      where: { id },
    });
    return true;
  } catch {
    return false;
  }
}
