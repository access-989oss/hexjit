import { randomUUID } from "node:crypto";

import type {
  AiCreditContext,
  AiExecutionRequest,
  AiExecutionResult,
  AiRouterContext,
} from "./execution.types.js";

function requirePositiveCost(
  value: number,
): number {
  if (
    !Number.isFinite(value) ||
    value < 0
  ) {
    throw new Error(
      "AI_INVALID_CREDIT_COST",
    );
  }

  return value;
}

export async function executeAiOperation(
  request: AiExecutionRequest,
  dependencies: {
    credits: AiCreditContext;
    router: AiRouterContext;
  },
): Promise<AiExecutionResult> {
  const operationId =
    randomUUID();

  const cost =
    requirePositiveCost(
      await dependencies.credits.getCost(
        request.capability,
      ),
    );

  const available =
    await dependencies.credits.getAvailableCredits(
      request.userId,
    );

  if (available < cost) {
    throw new Error(
      "HEXJIT_INSUFFICIENT_CREDITS",
    );
  }

  let reserved = false;

  try {
    await dependencies.credits.reserve({
      userId:
        request.userId,
      amount:
        cost,
      operationId,
      capability:
        request.capability,
    });

    reserved = true;

    /*
     * Current AI Router text contract.
     * Other capabilities will receive their own router
     * adapters without bypassing this gateway.
     */
    if (
      request.capability !== "text"
    ) {
      throw new Error(
        "AI_CAPABILITY_NOT_CONNECTED",
      );
    }

    const response =
      await dependencies.router.generateText({
        userId:
          request.userId,
        prompt:
          request.prompt,
        systemPrompt:
          request.systemPrompt,
        messages:
          request.messages,
        metadata:
          request.metadata,
      });

    await dependencies.credits.commit({
      userId:
        request.userId,
      amount:
        cost,
      operationId,
      capability:
        request.capability,
    });

    reserved = false;

    return {
      success: true,
      content:
        response.content,
      providerId:
        response.providerId,
      modelId:
        response.modelId,
      usage:
        response.usage,
      raw:
        response.raw,
    };
  } catch (error) {
    /*
     * Failed AI operations must not consume credits.
     */
    if (
      reserved &&
      dependencies.credits.release
    ) {
      try {
        await dependencies.credits.release({
          userId:
            request.userId,
          amount:
            cost,
          operationId,
          capability:
            request.capability,
        });
      } catch {
        /*
         * Preserve the original operation error.
         * Release failure is intentionally handled by the
         * credit subsystem's reconciliation mechanisms.
         */
      }
    }

    throw error;
  }
}
