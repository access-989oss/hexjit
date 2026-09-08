import {
  executeAiOperation,
} from "../execution/execution.service.js";

import type {
  AiCreditContext,
  AiExecutionRequest,
  AiExecutionResult,
  AiRouterContext,
} from "../execution/execution.types.js";

export type AiGatewayDependencies = {
  router: AiRouterContext;
  credits: AiCreditContext;
};

export function createAiGateway(
  dependencies: AiGatewayDependencies,
) {
  return {
    execute(
      request: AiExecutionRequest,
    ): Promise<AiExecutionResult> {
      return executeAiOperation(
        request,
        dependencies,
      );
    },
  };
}
