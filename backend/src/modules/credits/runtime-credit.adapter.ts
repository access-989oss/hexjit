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

/**
 * Runtime AI credit adapter.
 *
 * IMPORTANT:
 * This uses Hexjit's verified Credit Engine rather than
 * guessing the older credit.service.ts API.
 */
export function createRuntimeCreditContext(): AiCreditContext {
  return {
    getCost: async (
      capability,
    ) => {
      return getCreditCost(
        capability,
      );
    },

    getAvailableCredits: async (
      userId,
    ) => {
      return getAvailableCredits(
        userId,
      );
    },

    reserve: async (
      input,
    ) => {
      return reserveCredits(
        input,
      );
    },

    commit: async (
      input,
    ) => {
      return commitCredits(
        input,
      );
    },

    release: async (
      input,
    ) => {
      return releaseCredits(
        input,
      );
    },
  };
}
