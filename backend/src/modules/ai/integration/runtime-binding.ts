import {
  configureAiRuntime,
} from "./startup-binding.js";

import {
  createRuntimeAiRouterContext,
} from "./runtime-router.adapter.js";

import {
  createRuntimeCreditContext,
} from "../../credits/runtime-credit.adapter.js";

let configured = false;

export function configureProductionAiRuntime(): void {
  if (configured) {
    return;
  }

  configureAiRuntime(
    createRuntimeAiRouterContext(),
    createRuntimeCreditContext(),
  );

  configured = true;
}

export function isProductionAiRuntimeConfigured(): boolean {
  return configured;
}
