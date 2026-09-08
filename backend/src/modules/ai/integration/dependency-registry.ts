import type {
  AiCreditContext,
  AiRouterContext,
} from "../execution/execution.types.js";

export type AiRuntimeDependencies = {
  router: AiRouterContext;
  credits: AiCreditContext;
};

let dependencies:
  | AiRuntimeDependencies
  | null = null;

function assertRouter(
  router: AiRouterContext,
) {
  if (
    typeof router.generateText !==
    "function"
  ) {
    throw new Error(
      "AI_ROUTER_DEPENDENCY_INVALID",
    );
  }
}

function assertCredits(
  credits: AiCreditContext,
) {
  if (
    typeof credits.getCost !== "function" ||
    typeof credits.getAvailableCredits !==
      "function" ||
    typeof credits.reserve !== "function" ||
    typeof credits.commit !== "function"
  ) {
    throw new Error(
      "AI_CREDIT_DEPENDENCY_INVALID",
    );
  }

  if (
    credits.release !== undefined &&
    typeof credits.release !== "function"
  ) {
    throw new Error(
      "AI_CREDIT_RELEASE_DEPENDENCY_INVALID",
    );
  }
}

export function configureAiDependencies(
  input: AiRuntimeDependencies,
): void {
  assertRouter(input.router);
  assertCredits(input.credits);

  dependencies = input;
}

export function getAiDependencies(): AiRuntimeDependencies {
  if (!dependencies) {
    throw new Error(
      "AI_DEPENDENCIES_NOT_CONFIGURED",
    );
  }

  return dependencies;
}

export function hasAiDependencies(): boolean {
  return dependencies !== null;
}

export function clearAiDependencies(): void {
  dependencies = null;
}
