import type {
  ContactPersonaOverride,
  PersonaContext,
  PersonaProfile,
} from "./persona.types.js";

const DEFAULT_PERSONA: PersonaProfile = {
  language: "English",
  vocabulary: "normal",
  tone: "friendly",
  humor: "light",
  emojiLevel: "low",
  sentenceLength: "medium",
  greetings: [],
  closings: [],
  communicationRules: [],
  aiName: "Hexjit",
};

export function normalizePersona(
  persona?: PersonaProfile,
): PersonaProfile {
  return {
    ...DEFAULT_PERSONA,
    ...(persona ?? {}),
  };
}

export function mergePersona(
  persona: PersonaProfile,
  override?: ContactPersonaOverride,
): PersonaProfile {
  const normalized =
    normalizePersona(persona);

  if (!override) {
    return normalized;
  }

  return {
    ...normalized,
    ...(override.language !== undefined
      ? { language: override.language }
      : {}),
    ...(override.tone !== undefined
      ? { tone: override.tone }
      : {}),
    ...(override.emojiLevel !== undefined
      ? {
          emojiLevel:
            override.emojiLevel,
        }
      : {}),
    ...(override.sentenceLength !== undefined
      ? {
          sentenceLength:
            override.sentenceLength,
        }
      : {}),
    ...(override.communicationRules
      ? {
          communicationRules: [
            ...(normalized.communicationRules ??
              []),
            ...override.communicationRules,
          ],
        }
      : {}),
  };
}

export function buildPersonaContext(
  context: PersonaContext,
) {
  return mergePersona(
    context.persona,
    context.contactOverride,
  );
}
