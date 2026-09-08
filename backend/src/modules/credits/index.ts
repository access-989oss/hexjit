export {
  getCreditSnapshot,
  getAvailableCredits,
  reserveCredits,
  commitCredits,
  releaseCredits,
  getCreditCost,
} from "./credit-engine.service.js";

export {
  createAiCreditContext,
} from "./ai-credit-context.adapter.js";

export type {
  CreditCapability,
  CreditCostResolver,
  CreditOperation,
  CreditSnapshot,
} from "./credit.types.js";

// Existing credit API routes
export { registerCreditRoutes } from "./credit.routes.js";
