import {
  getProductionAiGateway,
} from "../../ai/index.js";

export type ProductionAiReplyInput = {
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
};

export async function executeProductionAiReply(
  input: ProductionAiReplyInput,
) {
  const gateway =
    getProductionAiGateway();

  return gateway.execute({
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
  });
}
