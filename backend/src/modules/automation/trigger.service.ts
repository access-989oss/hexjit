import {
  type AutomationDefinition,
} from "./automation.types.js";

export type AutomationEvent = {
  type: string;
  text?: string;
  contactId?: string;
  groupId?: string;
  mimeType?: string;
  metadata?: Record<string, unknown>;
};

function matchesKeyword(
  event: AutomationEvent,
  keywords: unknown,
): boolean {
  if (!event.text || !Array.isArray(keywords)) {
    return false;
  }

  const text =
    event.text.toLocaleLowerCase();

  return keywords.some(
    (keyword) =>
      typeof keyword === "string" &&
      text.includes(
        keyword.toLocaleLowerCase(),
      ),
  );
}

export function matchesTrigger(
  automation: AutomationDefinition,
  event: AutomationEvent,
): boolean {
  if (!automation.enabled) {
    return false;
  }

  if (
    automation.trigger !== event.type
  ) {
    return false;
  }

  const config =
    automation.triggerConfig ?? {};

  switch (automation.trigger) {
    case "KEYWORD":
      return matchesKeyword(
        event,
        config.keywords,
      );

    case "CONTACT":
      return (
        typeof config.contactId ===
          "string" &&
        config.contactId ===
          event.contactId
      );

    case "GROUP":
      return (
        typeof config.groupId ===
          "string" &&
        config.groupId ===
          event.groupId
      );

    case "IMAGE":
      return (
        event.type === "IMAGE"
      );

    case "VOICE":
      return (
        event.type === "VOICE"
      );

    case "FILE":
      return (
        event.type === "FILE"
      );

    case "NEW_MESSAGE":
      return (
        event.type === "NEW_MESSAGE"
      );

    case "SCHEDULE":
      return (
        event.type === "SCHEDULE"
      );

    default:
      return false;
  }
}
