import {
  executeAiOperation,
} from "../../ai/execution/index.js";

import type {
  AiCreditContext,
  AiRouterContext,
} from "../../ai/execution/index.js";

export async function executeAutomationAiReply(
  input: {
    userId: string;

    prompt: string;

    systemPrompt?: string;

    messages?: Array<{
      role:
        | "system"
        | "user"
        | "assistant";
      content: string;
    }>;

    metadata?: Record<string, unknown>;
  },
  dependencies: {
    credits: AiCreditContext;
    router: AiRouterContext;
  },
) {
  return executeAiOperation(
    {
      userId:
        input.userId,
      capability:
        "text",
      prompt:
        input.prompt,
      systemPrompt:
        input.systemPrompt,
      messages:
        input.messages,
      metadata:
        input.metadata,
    },
    dependencies,
  );
}
