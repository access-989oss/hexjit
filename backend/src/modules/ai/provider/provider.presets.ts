export type AiProviderPreset = {
  slug: string;
  name: string;
  protocol: string;
  baseUrl: string;
  capabilities: string[];
  requiresBaseUrl: boolean;
};

export const AI_PROVIDER_PRESETS: AiProviderPreset[] = [
  {
    slug: "nvidia",
    name: "NVIDIA",
    protocol: "openai_compatible",
    baseUrl: "https://integrate.api.nvidia.com",
    capabilities: ["text", "vision"],
    requiresBaseUrl: false,
  },
  {
    slug: "openai",
    name: "OpenAI",
    protocol: "openai_compatible",
    baseUrl: "https://api.openai.com",
    capabilities: ["text", "vision", "image", "speech_to_text", "text_to_speech", "video"],
    requiresBaseUrl: false,
  },
  {
    slug: "google",
    name: "Google",
    protocol: "google",
    baseUrl: "https://generativelanguage.googleapis.com",
    capabilities: ["text", "vision", "image"],
    requiresBaseUrl: false,
  },
  {
    slug: "anthropic",
    name: "Anthropic",
    protocol: "anthropic",
    baseUrl: "https://api.anthropic.com",
    capabilities: ["text", "vision"],
    requiresBaseUrl: false,
  },
  {
    slug: "xai",
    name: "xAI",
    protocol: "openai_compatible",
    baseUrl: "https://api.x.ai",
    capabilities: ["text", "vision", "image"],
    requiresBaseUrl: false,
  },
  {
    slug: "azure-openai",
    name: "Azure OpenAI",
    protocol: "azure_openai",
    baseUrl: "",
    capabilities: ["text", "vision", "image", "speech_to_text", "text_to_speech"],
    requiresBaseUrl: true,
  },
  {
    slug: "openrouter",
    name: "OpenRouter",
    protocol: "openai_compatible",
    baseUrl: "https://openrouter.ai/api",
    capabilities: ["text", "vision"],
    requiresBaseUrl: false,
  },
  {
    slug: "custom-openai-compatible",
    name: "Custom OpenAI-Compatible",
    protocol: "openai_compatible",
    baseUrl: "",
    capabilities: [
      "text",
      "vision",
      "image",
      "speech_to_text",
      "text_to_speech",
      "video",
    ],
    requiresBaseUrl: true,
  },
];

export function getProviderPreset(slug: string) {
  return AI_PROVIDER_PRESETS.find((item) => item.slug === slug) ?? null;
}
