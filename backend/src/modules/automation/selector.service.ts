import type {
  AutomationDefinition,
} from "./automation.types.js";

import {
  matchesTrigger,
  type AutomationEvent,
} from "./trigger.service.js";

import {
  conditionsMatch,
  type AutomationConditionContext,
} from "./condition.service.js";

export function selectAutomations(
  automations: AutomationDefinition[],
  event: AutomationEvent,
  context: AutomationConditionContext,
) {
  return [...automations]
    .filter((automation) =>
      matchesTrigger(
        automation,
        event,
      ),
    )
    .filter((automation) =>
      conditionsMatch(
        automation,
        context,
      ),
    )
    .sort(
      (a, b) =>
        a.priority - b.priority,
    );
}
