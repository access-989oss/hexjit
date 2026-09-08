import {
  generateText,
} from "../router/ai-router.service.js";

import type {
  AiRouterContext,
} from "../execution/execution.types.js";

/**
 * Boundary between the existing AI Router and the
 * centralized AI execution gateway.
 *
 * The router implementation remains the source of truth.
 */
export function createRuntimeAiRouterContext(): AiRouterContext {
  return {
    generateText: async (
      input,
    ) => {
      /*
       * The existing router is intentionally invoked through
       * its existing exported contract. The cast keeps this
       * integration boundary isolated from the execution layer.
       */
      return generateText(
        input as never,
      ) as never;
    },
  };
}
