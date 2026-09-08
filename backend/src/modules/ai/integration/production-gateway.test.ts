import assert from "node:assert/strict";
import test from "node:test";

import {
  clearAiDependencies,
} from "./dependency-registry.js";

import {
  configureAiRuntime,
} from "./startup-binding.js";

import {
  getProductionAiGateway,
} from "./production-gateway.js";

import type {
  AiRouterContext,
  AiCreditContext,
} from "../execution/execution.types.js";


test(
  "production gateway connects router and credit dependencies",
  async () => {
    clearAiDependencies();

    let routerCalls = 0;
    let reserved = 0;
    let committed = 0;
    let released = 0;

    const router: AiRouterContext = {
      async generateText() {
        routerCalls += 1;

        return {
          content:
            "Hexjit gateway response",
          providerId:
            "test-provider",
          modelId:
            "test-model",
        };
      },
    };

    const credits: AiCreditContext = {
      async getCost() {
        return 1;
      },

      async getAvailableCredits() {
        return 500;
      },

      async reserve() {
        reserved += 1;
      },

      async commit() {
        committed += 1;
      },

      async release() {
        released += 1;
      },
    };

    configureAiRuntime(
      router,
      credits,
    );

    const gateway =
      getProductionAiGateway();

    const result =
      await gateway.execute({
        userId:
          "gateway-test-user",
        capability:
          "text",
        prompt:
          "Test Hexjit",
      });

    assert.equal(
      result.success,
      true,
    );

    assert.equal(
      result.content,
      "Hexjit gateway response",
    );

    assert.equal(
      routerCalls,
      1,
    );

    assert.equal(
      reserved,
      1,
    );

    assert.equal(
      committed,
      1,
    );

    assert.equal(
      released,
      0,
    );

    clearAiDependencies();
  },
);
