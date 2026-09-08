import { getProviderSecret } from "./provider.service.js";

export async function testProviderConnection(providerId: string) {
  const startedAt = Date.now();

  const provider = await getProviderSecret(providerId);

  if (!provider) {
    return {
      success: false,
      providerId,
      latencyMs: Date.now() - startedAt,
      code: "AI_PROVIDER_NOT_FOUND",
      message: "Provider not found.",
    };
  }

  if (!provider.apiKey) {
    return {
      success: false,
      providerId,
      latencyMs: Date.now() - startedAt,
      code: "AI_API_KEY_NOT_CONFIGURED",
      message: "API key is not configured.",
    };
  }

  if (!provider.baseUrl) {
    return {
      success: false,
      providerId,
      latencyMs: Date.now() - startedAt,
      code: "AI_PROVIDER_BASE_URL_REQUIRED",
      message: "Provider base URL is not configured.",
    };
  }

  if (provider.protocol !== "openai_compatible") {
    return {
      success: false,
      providerId,
      latencyMs: Date.now() - startedAt,
      code: "AI_PROVIDER_ADAPTER_NOT_READY",
      message: `Adapter for protocol '${provider.protocol}' is not available yet.`,
    };
  }

  try {
    const response = await fetch(
      `${provider.baseUrl.replace(/\/+$/, "")}/v1/models`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${provider.apiKey}`,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(15000),
      },
    );

    const latencyMs = Date.now() - startedAt;

    if (response.ok) {
      return {
        success: true,
        providerId,
        latencyMs,
        code: "AI_PROVIDER_CONNECTED",
        message: "Provider connection successful.",
      };
    }

    let message = `Provider returned HTTP ${response.status}.`;

    try {
      const body = (await response.json()) as {
        error?: { message?: string };
        message?: string;
      };

      message =
        body.error?.message ??
        body.message ??
        message;
    } catch {
      // Provider response was not JSON.
    }

    return {
      success: false,
      providerId,
      latencyMs,
      code: "AI_PROVIDER_REQUEST_FAILED",
      message,
    };
  } catch (error) {
    return {
      success: false,
      providerId,
      latencyMs: Date.now() - startedAt,
      code: "AI_PROVIDER_CONNECTION_FAILED",
      message:
        error instanceof Error
          ? error.message
          : "Unable to connect to provider.",
    };
  }
}
