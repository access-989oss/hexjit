import {
  listPersistentAutomations,
} from "../persistence/index.js";

import type {
  AutomationDefinition,
  AutomationCondition,
  AutomationActionConfig,
} from "../automation.types.js";

function toDefinition(
  automation: Awaited<
    ReturnType<typeof listPersistentAutomations>
  >[number],
): AutomationDefinition | null {
  if (!automation) {
    return null;
  }

  return {
    id: automation.id,
    name: automation.name,
    enabled: automation.enabled,
    priority: automation.priority,
    trigger:
      automation.triggerType as AutomationDefinition["trigger"],
    triggerConfig:
      (automation.triggerConfig as
        | Record<string, unknown>
        | null) ?? undefined,

    conditions:
      automation.conditions.map(
        (item) =>
          ({
            type:
              item.conditionType as
                AutomationCondition["type"],
            value:
              item.value ?? undefined,
          }) satisfies AutomationCondition,
      ),

    actions:
      automation.actions
        .sort(
          (a, b) =>
            a.position - b.position,
        )
        .map(
          (item) =>
            ({
              type:
                item.actionType as AutomationActionConfig["type"],
              config:
                (item.actionConfig as
                  | Record<string, unknown>
                  | null) ?? {},
            }) satisfies AutomationActionConfig,
        ),
  };
}

export async function loadUserAutomations(
  userId: string,
): Promise<AutomationDefinition[]> {
  const persisted =
    await listPersistentAutomations(
      userId,
    );

  return persisted
    .map(toDefinition)
    .filter(
      (
        item,
      ): item is AutomationDefinition =>
        item !== null,
    );
}
