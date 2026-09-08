import {
  configureProductionAiRuntime,
} from "./runtime-binding.js";

import {
  getAiGateway,
} from "./runtime-gateway.js";

import {
  hasAiDependencies,
} from "./dependency-registry.js";

let initialized = false;

export function initializeProductionAiGateway(): void {
  if (initialized) {
    return;
  }

  /*
   * Never overwrite dependencies that have already been
   * configured by the application or by a test.
   */
  if (!hasAiDependencies()) {
    configureProductionAiRuntime();
  }

  initialized = true;
}

export function getProductionAiGateway() {
  initializeProductionAiGateway();

  return getAiGateway();
}

export function isProductionAiGatewayInitialized(): boolean {
  return initialized;
}
