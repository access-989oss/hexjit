import {
  createAiGateway,
} from "./gateway.factory.js";

import {
  getAiDependencies,
} from "./dependency-registry.js";

export function getAiGateway() {
  return createAiGateway(
    getAiDependencies(),
  );
}
