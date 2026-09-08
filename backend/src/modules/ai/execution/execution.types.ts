export type AiExecutionCapability =
  | "text"
  | "vision"
  | "image"
  | "speech_to_text"
  | "text_to_speech"
  | "video";

export type AiExecutionRequest = {
  userId: string;
  capability: AiExecutionCapability;

  prompt?: string;

  systemPrompt?: string;

  messages?: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }>;

  metadata?: Record<string, unknown>;
};

export type AiExecutionResult = {
  success: boolean;

  content?: string;

  providerId?: string;

  modelId?: string;

  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };

  raw?: unknown;
};

export type AiCreditContext = {
  /*
   * Credit layer is injected.
   * No database schema is assumed here.
   */
  getCost: (
    capability: AiExecutionCapability,
  ) => Promise<number>;

  getAvailableCredits: (
    userId: string,
  ) => Promise<number>;

  reserve: (
    input: {
      userId: string;
      amount: number;
      operationId: string;
      capability: AiExecutionCapability;
    },
  ) => Promise<void>;

  commit: (
    input: {
      userId: string;
      amount: number;
      operationId: string;
      capability: AiExecutionCapability;
    },
  ) => Promise<void>;

  release?: (
    input: {
      userId: string;
      amount: number;
      operationId: string;
      capability: AiExecutionCapability;
    },
  ) => Promise<void>;
};

export type AiRouterContext = {
  generateText: (
    input: {
      userId: string;
      prompt?: string;
      systemPrompt?: string;
      messages?: Array<{
        role: "system" | "user" | "assistant";
        content: string;
      }>;
      metadata?: Record<string, unknown>;
    },
  ) => Promise<{
    content?: string;
    providerId?: string;
    modelId?: string;
    usage?: {
      inputTokens?: number;
      outputTokens?: number;
      totalTokens?: number;
    };
    raw?: unknown;
  }>;
};
