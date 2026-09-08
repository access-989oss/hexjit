import assert from "node:assert/strict";
import test from "node:test";

import {
  configureAiDependencies,
  getAiDependencies,
  hasAiDependencies,
  clearAiDependencies,
} from "./dependency-registry.js";

import type {
  AiCreditContext,
  AiRouterContext,
} from "../execution/execution.types.js";


function makeRouter(): AiRouterContext {
  return {
    async generateText() {
      return {
        content: "test",
      };
    },
  };
}


function makeCredits(): AiCreditContext {
  return {
    async getCost() {
      return 1;
    },

    async getAvailableCredits() {
      return 500;
    },

    async reserve() {
      return undefined;
    },

    async commit() {
      return undefined;
    },

    async release() {
      return undefined;
    },
  };
}


test(
  "registry starts without configured dependencies",
  () => {
    clearAiDependencies();

    assert.equal(
      hasAiDependencies(),
      false,
    );

    assert.throws(
      () =>
        getAiDependencies(),
      {
        message:
          "AI_DEPENDENCIES_NOT_CONFIGURED",
      },
    );
  },
);


test(
  "registry stores valid router and credit dependencies",
  () => {
    clearAiDependencies();

    const router =
      makeRouter();

    const credits =
      makeCredits();

    configureAiDependencies({
      router,
      credits,
    });

    assert.equal(
      hasAiDependencies(),
      true,
    );

    const resolved =
      getAiDependencies();

    assert.strictEqual(
      resolved.router,
      router,
    );

    assert.strictEqual(
      resolved.credits,
      credits,
    );
  },
);


test(
  "registry can be cleared",
  () => {
    clearAiDependencies();

    configureAiDependencies({
      router:
        makeRouter(),
      credits:
        makeCredits(),
    });

    assert.equal(
      hasAiDependencies(),
      true,
    );

    clearAiDependencies();

    assert.equal(
      hasAiDependencies(),
      false,
    );
  },
);


test(
  "invalid router dependency is rejected",
  () => {
    clearAiDependencies();

    assert.throws(
      () =>
        configureAiDependencies({
          router:
            {
              generateText:
                undefined as never,
            },
          credits:
            makeCredits(),
        }),
      {
        message:
          "AI_ROUTER_DEPENDENCY_INVALID",
      },
    );
  },
);


test(
  "invalid credit dependency is rejected",
  () => {
    clearAiDependencies();

    assert.throws(
      () =>
        configureAiDependencies({
          router:
            makeRouter(),
          credits:
            {
              getCost:
                undefined as never,
              getAvailableCredits:
                undefined as never,
              reserve:
                undefined as never,
              commit:
                undefined as never,
            },
        }),
      {
        message:
          "AI_CREDIT_DEPENDENCY_INVALID",
      },
    );
  },
);
