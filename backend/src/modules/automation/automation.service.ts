import type {
  AutomationDefinition,
} from "./automation.types.js";

import type {
  AutomationEvent,
} from "./trigger.service.js";

import type {
  AutomationConditionContext,
} from "./condition.service.js";

import {
  selectAutomations,
} from "./selector.service.js";

import {
  executeAutomationActions,
  type AutomationExecutionContext,
} from "./action.service.js";

export async function runAutomations(
  automations: AutomationDefinition[],
  event: AutomationEvent,
  conditionContext: AutomationConditionContext,
  executionContext: AutomationExecutionContext,
) {
  const selected =
    selectAutomations(
      automations,
      event,
      conditionContext,
    );

  const results = [];

  for (const automation of selected) {
    const result =
      await executeAutomationActions(
        automation.actions,
        executionContext,
      );

    results.push({
      automationId:
        automation.id,
      name:
        automation.name,
      result,
    });

    if (
      result.stopped ||
      result.ignored
    ) {
      break;
    }
  }

  return {
    matchedCount: selected.length,
    results,
  };
}
