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
    idempotencyKey: string;
    eventData?: unknown;
  },
) {
  /*
   * First attempt: create the run.
   *
   * idempotencyKey is backed by a database UNIQUE constraint,
   * so concurrent webhook deliveries cannot create two runs
   * for the same automation event.
   */
  try {
    const run =
      await prisma.hexjitAutomationRun.create({
        data: {
          automationId:
            input.automationId,

          userId:
            input.userId,

          idempotencyKey:
            input.idempotencyKey,

          eventType:
            input.eventType,

          eventData:
            jsonValue(input.eventData),

          status:
            "RUNNING",
        },
      });

    return {
      run,
      alreadyRunning: false,
      alreadyCompleted: false,
    };
  } catch (error) {
    /*
     * Prisma unique violation means another request already
     * owns this exact automation event.
     */
    if (
      !(
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "P2002"
      )
    ) {
      throw error;
    }

    const existing =
      await prisma.hexjitAutomationRun.findUnique({
        where: {
          idempotencyKey:
            input.idempotencyKey,
        },
      });

    if (!existing) {
      throw error;
    }

    if (existing.status === "COMPLETED") {
      return {
        run: existing,
        alreadyRunning: false,
        alreadyCompleted: true,
      };
    }

    if (existing.status === "RUNNING") {
      return {
        run: existing,
        alreadyRunning: true,
        alreadyCompleted: false,
      };
    }

    /*
     * FAILED is retryable.
     *
     * Claim it atomically. Only one retry can move FAILED -> RUNNING.
     */
    const claimed =
      await prisma.hexjitAutomationRun.updateMany({
        where: {
          id:
            existing.id,

          status:
            "FAILED",
        },

        data: {
          status:
            "RUNNING",

          errorMessage:
            null,

          resultData:
            undefined,

          completedAt:
            null,

          startedAt:
            new Date(),
        },
      });

    if (claimed.count === 1) {
      const retry =
        await prisma.hexjitAutomationRun.findUnique({
          where: {
            id:
              existing.id,
          },
        });

      if (!retry) {
        throw new Error(
          "AUTOMATION_RUN_RETRY_NOT_FOUND",
        );
      }

      return {
        run: retry,
        alreadyRunning: false,
        alreadyCompleted: false,
      };
    }

    /*
     * Another retry won the race.
     */
    const current =
      await prisma.hexjitAutomationRun.findUnique({
        where: {
          idempotencyKey:
            input.idempotencyKey,
        },
      });

    if (!current) {
      throw new Error(
        "AUTOMATION_RUN_STATE_NOT_FOUND",
      );
    }

    return {
      run: current,
      alreadyRunning:
        current.status === "RUNNING",

      alreadyCompleted:
        current.status === "COMPLETED",
    };
  }
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
