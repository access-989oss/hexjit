import assert from "node:assert/strict";
import test from "node:test";

import {
  executeAiOperation,
} from "./execution.service.js";

import type {
  AiCreditContext,
  AiRouterContext,
} from "./execution.types.js";


function createCredits(
  available = 500,
  cost = 1,
) {
  const calls = {
    getCost: 0,
    getAvailableCredits: 0,
    reserve: 0,
    commit: 0,
    release: 0,
  };

  const creditLog: string[] = [];

  const credits: AiCreditContext = {
    async getCost() {
      calls.getCost += 1;
      return cost;
    },

    async getAvailableCredits() {
      calls.getAvailableCredits += 1;
      return available;
    },

    async reserve() {
      calls.reserve += 1;
      creditLog.push("reserve");
    },

    async commit() {
      calls.commit += 1;
      creditLog.push("commit");
    },

    async release() {
      calls.release += 1;
      creditLog.push("release");
    },
  };

  return {
    credits,
    calls,
    creditLog,
  };
}


function createRouter(
  result?: Partial<
    Awaited<
      ReturnType<
        AiRouterContext["generateText"]
      >
    >
  >,
) {
  let calls = 0;

  const router: AiRouterContext = {
    async generateText() {
      calls += 1;

      return {
        content:
          result?.content ??
          "Test AI response",

        providerId:
          result?.providerId ??
          "test-provider",

        modelId:
          result?.modelId ??
          "test-model",

        usage:
          result?.usage,

        raw:
          result?.raw,
      };
    },
  };

  return {
    router,
    getCalls: () => calls,
  };
}


test(
  "successful text operation commits credits exactly once",
  async () => {
    const {
      credits,
      calls,
      creditLog,
    } = createCredits(500, 1);

    const {
      router,
      getCalls,
    } = createRouter({
      content:
        "Hello from AI",
    });

    const result =
      await executeAiOperation(
        {
          userId:
            "user-1",
          capability:
            "text",
          prompt:
            "Say hello",
        },
        {
          credits,
          router,
        },
      );

    assert.equal(
      result.success,
      true,
    );

    assert.equal(
      result.content,
      "Hello from AI",
    );

    assert.equal(
      getCalls(),
      1,
    );

    assert.equal(
      calls.reserve,
      1,
    );

    assert.equal(
      calls.commit,
      1,
    );

    assert.equal(
      calls.release,
      0,
    );

    assert.deepEqual(
      creditLog,
      [
        "reserve",
        "commit",
      ],
    );
  },
);


test(
  "insufficient credits prevents AI execution",
  async () => {
    const {
      credits,
      calls,
    } = createCredits(0, 1);

    const {
      router,
      getCalls,
    } = createRouter();

    await assert.rejects(
      executeAiOperation(
        {
          userId:
            "user-2",
          capability:
            "text",
          prompt:
            "This must not run",
        },
        {
          credits,
          router,
        },
      ),
      {
        message:
          "HEXJIT_INSUFFICIENT_CREDITS",
      },
    );

    assert.equal(
      getCalls(),
      0,
    );

    assert.equal(
      calls.reserve,
      0,
    );

    assert.equal(
      calls.commit,
      0,
    );

    assert.equal(
      calls.release,
      0,
    );
  },
);


test(
  "AI provider failure releases reserved credits and never commits",
  async () => {
    const {
      credits,
      calls,
      creditLog,
    } = createCredits(500, 1);

    let routerCalls = 0;

    const router: AiRouterContext = {
      async generateText() {
        routerCalls += 1;

        throw new Error(
          "TEST_AI_PROVIDER_FAILURE",
        );
      },
    };

    await assert.rejects(
      executeAiOperation(
        {
          userId:
            "user-3",
          capability:
            "text",
          prompt:
            "Trigger failure",
        },
        {
          credits,
          router,
        },
      ),
      {
        message:
          "TEST_AI_PROVIDER_FAILURE",
      },
    );

    assert.equal(
      routerCalls,
      1,
    );

    assert.equal(
      calls.reserve,
      1,
    );

    assert.equal(
      calls.commit,
      0,
    );

    assert.equal(
      calls.release,
      1,
    );

    assert.deepEqual(
      creditLog,
      [
        "reserve",
        "release",
      ],
    );
  },
);


test(
  "unsupported capability releases reservation and does not call text router",
  async () => {
    const {
      credits,
      calls,
      creditLog,
    } = createCredits(500, 1);

    const {
      router,
      getCalls,
    } = createRouter();

    await assert.rejects(
      executeAiOperation(
        {
          userId:
            "user-4",
          capability:
            "image",
          prompt:
            "Generate image",
        },
        {
          credits,
          router,
        },
      ),
      {
        message:
          "AI_CAPABILITY_NOT_CONNECTED",
      },
    );

    assert.equal(
      getCalls(),
      0,
    );

    assert.equal(
      calls.reserve,
      1,
    );

    assert.equal(
      calls.commit,
      0,
    );

    assert.equal(
      calls.release,
      1,
    );

    assert.deepEqual(
      creditLog,
      [
        "reserve",
        "release",
      ],
    );
  },
);


test(
  "zero-cost operation does not break execution",
  async () => {
    const {
      credits,
      calls,
      creditLog,
    } = createCredits(0, 0);

    const {
      router,
      getCalls,
    } = createRouter({
      content:
        "Free operation",
    });

    const result =
      await executeAiOperation(
        {
          userId:
            "user-5",
          capability:
            "text",
          prompt:
            "Run free operation",
        },
        {
          credits,
          router,
        },
      );

    assert.equal(
      result.success,
      true,
    );

    assert.equal(
      getCalls(),
      1,
    );

    assert.equal(
      calls.reserve,
      1,
    );

    assert.equal(
      calls.commit,
      1,
    );

    assert.equal(
      calls.release,
      0,
    );

    assert.deepEqual(
      creditLog,
      [
        "reserve",
        "commit",
      ],
    );
  },
);


test(
  "negative credit cost is rejected before reservation",
  async () => {
    const {
      credits,
      calls,
    } = createCredits(500, -1);

    const {
      router,
      getCalls,
    } = createRouter();

    await assert.rejects(
      executeAiOperation(
        {
          userId:
            "user-6",
          capability:
            "text",
          prompt:
            "Invalid cost",
        },
        {
          credits,
          router,
        },
      ),
      {
        message:
          "AI_INVALID_CREDIT_COST",
      },
    );

    assert.equal(
      calls.reserve,
      0,
    );

    assert.equal(
      calls.commit,
      0,
    );

    assert.equal(
      calls.release,
      0,
    );

    assert.equal(
      getCalls(),
      0,
    );
  },
);
