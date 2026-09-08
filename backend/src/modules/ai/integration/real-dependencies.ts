/*
 * STEP 42
 *
 * This file intentionally contains only adapter contracts.
 * The existing AI Router and Credit Engine remain the
 * source of truth.
 *
 * We do not duplicate provider logic or credit accounting.
 */

import type {
  AiCreditContext,
  AiRouterContext,
} from "../execution/execution.types.js";

export type RealAiDependencies = {
  router: AiRouterContext;
  credits: AiCreditContext;
};
