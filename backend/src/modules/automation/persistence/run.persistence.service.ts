import { prisma } from "../../../lib/prisma.js";
import type { Prisma } from "../../../generated/prisma/client.js";

function jsonValue(
  value: unknown,
): Prisma.InputJsonValue | undefined {
  if (value === undefined) {
    return undefined;
  }

  return value as Prisma.InputJsonValue;
}

export async function startPersistentAutomationRun(
  input: {
    automationId: string;
    userId: string;
    eventType: string;
    eventData?: unknown;
  },
) {
  return prisma.hexjitAutomationRun.create({
    data: {
      automationId:
        input.automationId,
      userId:
        input.userId,
      eventType:
        input.eventType,
      eventData:
        jsonValue(input.eventData),
      status: "RUNNING",
    },
  });
}

export async function completePersistentAutomationRun(
  runId: string,
  resultData?: unknown,
) {
  return prisma.hexjitAutomationRun.update({
    where: {
      id: runId,
    },
    data: {
      status: "COMPLETED",
      resultData:
        jsonValue(resultData),
      completedAt: new Date(),
    },
  });
}

export async function failPersistentAutomationRun(
  runId: string,
  errorMessage: string,
) {
  return prisma.hexjitAutomationRun.update({
    where: {
      id: runId,
    },
    data: {
      status: "FAILED",
      errorMessage,
      completedAt: new Date(),
    },
  });
}

export async function listPersistentAutomationRuns(
  automationId: string,
  userId: string,
) {
  const owned =
    await prisma.hexjitAutomation.findFirst({
      where: {
        id: automationId,
        userId,
      },
      select: {
        id: true,
      },
    });

  if (!owned) {
    return [];
  }

  return prisma.hexjitAutomationRun.findMany({
    where: {
      automationId,
    },
    orderBy: {
      startedAt: "desc",
    },
    take: 100,
  });
}
