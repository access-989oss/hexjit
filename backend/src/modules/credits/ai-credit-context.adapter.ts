import {
  getCreditCost,
  getAvailableCredits,
  reserveCredits,
  commitCredits,
  releaseCredits,
} from "./credit-engine.service.js";

import type {
  AiCreditContext,
} from "../ai/execution/execution.types.js";

export function createAiCreditContext(): AiCreditContext {
  return {
    getCost:
      async (capability) =>
        getCreditCost(
          capability,
        ),

    getAvailableCredits:
      async (userId) =>
        getAvailableCredits(
          userId,
        ),

    reserve:
      async (input) =>
        reserveCredits(
          input,
        ),

    commit:
      async (input) =>
        commitCredits(
          input,
        ),

    release:
      async (input) =>
        releaseCredits(
          input,
        ),
  };
}
