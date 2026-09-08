export type AiCapability =
  | "text"
  | "vision"
  | "image"
  | "speech_to_text"
  | "text_to_speech"
  | "video";

export type AiGenerateTextInput = {
  model: string;
  messages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }>;
  temperature?: number;
  maxTokens?: number;
};

export type AiGenerateTextOutput = {
  text: string;
  model: string;
  provider: string;
  raw?: unknown;
};

export interface AiProviderAdapter {
  generateText(
    input: AiGenerateTextInput,
  ): Promise<AiGenerateTextOutput>;
}
