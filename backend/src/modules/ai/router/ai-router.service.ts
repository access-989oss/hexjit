import { prisma } from "../../../lib/prisma.js";
import {
  getProviderSecret,
} from "../provider/provider.service.js";
import {
  OpenAiCompatibleAdapter,
} from "../adapters/openai-compatible.adapter.js";
import type {
  AiCapability,
  AiGenerateTextInput,
  AiGenerateTextOutput,
} from "./types.js";

export async function resolveTextRoute() {
  const routes =
    await prisma.aiRoute.findMany({
      where: {
        capability: "text",
        isEnabled: true,
      },
      orderBy: {
        priority: "asc",
      },
    });

  for (const route of routes) {
    if (
      !route.providerId ||
      !route.modelId
    ) {
      continue;
    }

    const model =
      await prisma.aiModel.findFirst({
        where: {
          id: route.modelId,
          providerId:
            route.providerId,
          capability: "text",
          isEnabled: true,
        },
      });

    if (!model) {
      continue;
    }

    const secret =
      await getProviderSecret(
        route.providerId,
      );

    if (!secret) {
      continue;
    }

    return {
      route,
      model,
      provider: secret,
    };
  }

  return null;
}

export async function generateText(
  input: Omit<
    AiGenerateTextInput,
    "model"
  > & {
    model?: string;
  },
): Promise<AiGenerateTextOutput> {
  const resolved =
    await resolveTextRoute();

  if (!resolved) {
    throw new Error(
      "NO_TEXT_AI_ROUTE_CONFIGURED",
    );
  }

  const model =
    input.model ??
    resolved.model.model;

  if (
    resolved.provider.protocol ===
      "openai_compatible"
  ) {
    const adapter =
      new OpenAiCompatibleAdapter(
        resolved.provider.baseUrl,
        resolved.provider.apiKey,
        resolved.provider.id,
      );

    return adapter.generateText({
      ...input,
      model,
    });
  }

  throw new Error(
    "AI_PROVIDER_PROTOCOL_NOT_SUPPORTED",
  );
}

export function isSupportedCapability(
  value: string,
): value is AiCapability {
  return [
    "text",
    "vision",
    "image",
    "speech_to_text",
    "text_to_speech",
    "video",
  ].includes(value);
}
