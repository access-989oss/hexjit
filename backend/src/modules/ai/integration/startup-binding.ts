import {
  configureAiDependencies,
} from "./dependency-registry.js";

import type {
  AiRouterContext,
  AiCreditContext,
} from "../execution/execution.types.js";

export function configureAiRuntime(
  router: AiRouterContext,
  credits: AiCreditContext,
): void {
  configureAiDependencies({
    router,
    credits,
  });
}
