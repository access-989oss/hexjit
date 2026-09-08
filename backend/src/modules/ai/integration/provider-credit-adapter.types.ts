import type {
  AiCreditContext,
  AiRouterContext,
} from "../execution/execution.types.js";

/**
 * Concrete adapters bridge the already-existing
 * Router/Credit implementations into the execution
 * gateway contracts.
 */
export type ConcreteAiRouterAdapter =
  AiRouterContext;

export type ConcreteCreditAdapter =
  AiCreditContext;
