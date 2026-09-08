import type {
  AutomationCondition,
  AutomationDefinition,
} from "./automation.types.js";

export type AutomationConditionContext = {
  contactId?: string;
  groupId?: string;
  text?: string;
  enabled?: boolean;
  hour?: number;
  aiIntent?: string;
  previousMessage?: string;
};

function evaluateCondition(
  condition: AutomationCondition,
  context: AutomationConditionContext,
): boolean {
  switch (condition.type) {
    case "CONTACT":
      return (
        context.contactId ===
        condition.value
      );

    case "GROUP":
      return (
        context.groupId ===
        condition.value
      );

    case "KEYWORD":
      if (
        typeof condition.value !==
        "string" ||
        !context.text
      ) {
        return false;
      }

      return context.text
        .toLocaleLowerCase()
        .includes(
          condition.value.toLocaleLowerCase(),
        );

    case "WORKING_HOURS": {
      const range =
        condition.value as
          | {
              start?: number;
              end?: number;
            }
          | undefined;

      if (
        typeof context.hour !==
        "number" ||
        typeof range?.start !==
        "number" ||
        typeof range?.end !==
        "number"
      ) {
        return false;
      }

      if (
        range.start <= range.end
      ) {
        return (
          context.hour >=
            range.start &&
          context.hour <
            range.end
        );
      }

      return (
        context.hour >=
          range.start ||
        context.hour <
          range.end
      );
    }

    case "AI_INTENT":
      return (
        typeof condition.value ===
          "string" &&
        context.aiIntent ===
          condition.value
      );

    case "PREVIOUS_MESSAGE":
      return (
        typeof condition.value ===
          "string" &&
        context.previousMessage ===
          condition.value
      );

    case "ENABLED":
      return (
        context.enabled ===
        Boolean(condition.value)
      );

    default:
      return false;
  }
}

export function conditionsMatch(
  automation: AutomationDefinition,
  context: AutomationConditionContext,
): boolean {
  const conditions =
    automation.conditions ?? [];

  return conditions.every(
    (condition) =>
      evaluateCondition(
        condition,
        context,
      ),
  );
}
