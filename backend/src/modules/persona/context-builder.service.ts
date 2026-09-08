import {
  buildPersonaPrompt,
} from "./prompt-builder.service.js";

import {
  formatMemoryContext,
  selectMemories,
} from "./memory.service.js";

import {
  buildPersonaContext,
} from "./persona.service.js";

import type {
  PersonaContext,
} from "./persona.types.js";

export function buildAiContext(
  context: PersonaContext,
) {
  const effectivePersona =
    buildPersonaContext(context);

  return {
    persona: effectivePersona,
    personaPrompt:
      buildPersonaPrompt(
        effectivePersona,
      ),
    memory:
      selectMemories(
        context.memories,
      ),
    memoryPrompt:
      formatMemoryContext(
        context.memories,
      ),
  };
}

export function buildSystemPrompt(
  context: PersonaContext,
) {
  const aiContext =
    buildAiContext(context);

  return [
    aiContext.personaPrompt,
    "",
    "RELEVANT MEMORY:",
    aiContext.memoryPrompt,
  ].join("\n");
}
