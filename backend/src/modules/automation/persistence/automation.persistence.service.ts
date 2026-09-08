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

export async function createPersistentAutomation(input: {
  userId: string;
  name: string;
  enabled?: boolean;
  priority?: number;
  triggerType: string;
  triggerConfig?: unknown;
  conditions?: Array<{
    conditionType: string;
    value?: unknown;
    position?: number;
  }>;
  actions?: Array<{
    actionType: string;
    actionConfig?: unknown;
    position?: number;
  }>;
}) {
  if (!input.userId) {
    throw new Error(
      "AUTOMATION_USER_ID_REQUIRED",
    );
  }

  if (!input.name.trim()) {
    throw new Error(
      "AUTOMATION_NAME_REQUIRED",
    );
  }

  if (!input.triggerType) {
    throw new Error(
      "AUTOMATION_TRIGGER_REQUIRED",
    );
  }

  return prisma.$transaction(
    async (tx) => {
      const automation =
        await tx.hexjitAutomation.create({
          data: {
            userId: input.userId,
            name: input.name.trim(),
            enabled:
              input.enabled ?? true,
            priority:
              input.priority ?? 100,
            triggerType:
              input.triggerType,
            triggerConfig:
              jsonValue(
                input.triggerConfig,
              ),
          },
        });

      const conditions =
        input.conditions ?? [];

      for (
        let index = 0;
        index < conditions.length;
        index++
      ) {
        const condition =
          conditions[index];

        await tx.hexjitAutomationCondition.create({
          data: {
            automationId:
              automation.id,
            conditionType:
              condition.conditionType,
            value:
              jsonValue(
                condition.value,
              ),
            position:
              condition.position ??
              index,
          },
        });
      }

      const actions =
        input.actions ?? [];

      for (
        let index = 0;
        index < actions.length;
        index++
      ) {
        const action =
          actions[index];

        await tx.hexjitAutomationAction.create({
          data: {
            automationId:
              automation.id,
            actionType:
              action.actionType,
            actionConfig:
              jsonValue(
                action.actionConfig,
              ),
            position:
              action.position ??
              index,
          },
        });
      }

      return automation;
    },
  );
}

export async function getPersistentAutomation(
  automationId: string,
  userId: string,
) {
  const automation =
    await prisma.hexjitAutomation.findFirst({
      where: {
        id: automationId,
        userId,
      },
    });

  if (!automation) {
    return null;
  }

  const [
    conditions,
    actions,
  ] = await Promise.all([
    prisma.hexjitAutomationCondition.findMany({
      where: {
        automationId,
      },
      orderBy: {
        position: "asc",
      },
    }),
    prisma.hexjitAutomationAction.findMany({
      where: {
        automationId,
      },
      orderBy: {
        position: "asc",
      },
    }),
  ]);

  return {
    ...automation,
    conditions,
    actions,
  };
}

export async function listPersistentAutomations(
  userId: string,
) {
  const automations =
    await prisma.hexjitAutomation.findMany({
      where: {
        userId,
      },
      orderBy: [
        {
          priority: "asc",
        },
        {
          createdAt: "asc",
        },
      ],
    });

  return Promise.all(
    automations.map(
      (automation) =>
        getPersistentAutomation(
          automation.id,
          userId,
        ),
    ),
  );
}

export async function setPersistentAutomationEnabled(
  automationId: string,
  userId: string,
  enabled: boolean,
) {
  const result =
    await prisma.hexjitAutomation.updateMany({
      where: {
        id: automationId,
        userId,
      },
      data: {
        enabled,
      },
    });

  return result.count > 0;
}

export async function deletePersistentAutomation(
  automationId: string,
  userId: string,
) {
  return prisma.$transaction(
    async (tx) => {
      const owned =
        await tx.hexjitAutomation.findFirst({
          where: {
            id: automationId,
            userId,
          },
          select: {
            id: true,
          },
        });

      if (!owned) {
        return false;
      }

      await tx.hexjitAutomationCondition.deleteMany({
        where: {
          automationId,
        },
      });

      await tx.hexjitAutomationAction.deleteMany({
        where: {
          automationId,
        },
      });

      await tx.hexjitAutomationRun.deleteMany({
        where: {
          automationId,
        },
      });

      await tx.hexjitAutomation.delete({
        where: {
          id: automationId,
        },
      });

      return true;
    },
  );
}
