import type {
  AiRouterContext,
} from "../execution/execution.types.js";

/**
 * Adapter factory.
 *
 * The actual router implementation is injected by the
 * application bootstrap. This prevents automation,
 * credits and provider code from becoming coupled.
 */
export function createAiRouterAdapter(
  generateText: AiRouterContext["generateText"],
): AiRouterContext {
  if (
    typeof generateText !== "function"
  ) {
    throw new Error(
      "AI_ROUTER_GENERATE_TEXT_REQUIRED",
    );
  }

  return {
    generateText,
  };
}
