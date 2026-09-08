import {
  executeAutomationAiReply,
} from "./ai-action.adapter.js";

import type {
  AiCreditContext,
  AiRouterContext,
} from "../../ai/execution/index.js";

export type AutomationAiExecutorDependencies = {
  router: AiRouterContext;
  credits: AiCreditContext;
};

export async function runAutomationAiReply(
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
  dependencies:
    AutomationAiExecutorDependencies,
) {
  return executeAutomationAiReply(
    input,
    dependencies,
  );
}
