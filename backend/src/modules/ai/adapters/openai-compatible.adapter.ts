import type {
  AiGenerateTextInput,
  AiGenerateTextOutput,
  AiProviderAdapter,
} from "../router/types.js";

export class OpenAiCompatibleAdapter
  implements AiProviderAdapter
{
  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
    private readonly providerName: string,
  ) {}

  async generateText(
    input: AiGenerateTextInput,
  ): Promise<AiGenerateTextOutput> {
    const url =
      this.baseUrl.replace(/\/+$/, "") +
      "/v1/chat/completions";

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type":
          "application/json",
        Authorization:
          `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: input.model,
        messages: input.messages,
        ...(input.temperature !==
        undefined
          ? {
              temperature:
                input.temperature,
            }
          : {}),
        ...(input.maxTokens !==
        undefined
          ? {
              max_tokens:
                input.maxTokens,
            }
          : {}),
      }),
    });

    if (!response.ok) {
      const body =
        await response.text();

      throw new Error(
        `AI_PROVIDER_HTTP_${response.status}: ${body.slice(
          0,
          500,
        )}`,
      );
    }

    const data =
      (await response.json()) as {
        choices?: Array<{
          message?: {
            content?: unknown;
          };
        }>;
        model?: string;
      };

    const content =
      data.choices?.[0]?.message
        ?.content;

    if (typeof content !== "string") {
      throw new Error(
        "AI_PROVIDER_INVALID_RESPONSE",
      );
    }

    return {
      text: content,
      model:
        typeof data.model ===
        "string"
          ? data.model
          : input.model,
      provider:
        this.providerName,
      raw: data,
    };
  }
}
