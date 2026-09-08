import type {
  AiCreditContext,
} from "../execution/execution.types.js";

/**
 * Adapter factory for the existing Hexjit Credit Engine.
 *
 * No Prisma fields or database operations are duplicated
 * here.
 */
export function createCreditAdapter(
  dependencies: AiCreditContext,
): AiCreditContext {
  if (
    typeof dependencies.getCost !== "function" ||
    typeof dependencies.getAvailableCredits !== "function" ||
    typeof dependencies.reserve !== "function" ||
    typeof dependencies.commit !== "function"
  ) {
    throw new Error(
      "AI_CREDIT_ENGINE_CONTRACT_INVALID",
    );
  }

  return dependencies;
}
