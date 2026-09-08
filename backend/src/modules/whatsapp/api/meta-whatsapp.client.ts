import {
  getWhatsAppAccountSecret,
} from "../account/account.service.js";

const META_GRAPH_VERSION =
  process.env.META_GRAPH_VERSION ?? "v23.0";

function graphUrl(
  path: string,
) {
  return `https://graph.facebook.com/${META_GRAPH_VERSION}${path}`;
}

export async function testWhatsAppConnection(
  accountId: string,
) {
  const startedAt = Date.now();

  const account =
    await getWhatsAppAccountSecret(accountId);

  if (!account) {
    return {
      success: false,
      code: "WHATSAPP_ACCOUNT_NOT_FOUND",
      latencyMs: Date.now() - startedAt,
    };
  }

  if (!account.accessToken) {
    return {
      success: false,
      code: "WHATSAPP_ACCESS_TOKEN_NOT_CONFIGURED",
      latencyMs: Date.now() - startedAt,
    };
  }

  try {
    const response = await fetch(
      graphUrl(`/${account.phoneNumberId}`),
      {
        method: "GET",
        headers: {
          Authorization:
            `Bearer ${account.accessToken}`,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(15000),
      },
    );

    const latencyMs =
      Date.now() - startedAt;

    if (response.ok) {
      return {
        success: true,
        code: "WHATSAPP_CONNECTED",
        latencyMs,
      };
    }

    let message =
      `WhatsApp API returned HTTP ${response.status}.`;

    try {
      const body =
        (await response.json()) as {
          error?: {
            message?: string;
            code?: number;
          };
        };

      if (body.error?.message) {
        message = body.error.message;
      }
    } catch {
      // Non-JSON provider response.
    }

    return {
      success: false,
      code: "WHATSAPP_API_ERROR",
      message,
      latencyMs,
    };
  } catch (error) {
    return {
      success: false,
      code: "WHATSAPP_CONNECTION_FAILED",
      message:
        error instanceof Error
          ? error.message
          : "Unable to connect to WhatsApp API.",
      latencyMs:
        Date.now() - startedAt,
    };
  }
}

export async function sendWhatsAppText(
  accountId: string,
  recipientPhone: string,
  message: string,
) {
  const account =
    await getWhatsAppAccountSecret(accountId);

  if (!account) {
    throw new Error(
      "WHATSAPP_ACCOUNT_NOT_FOUND",
    );
  }

  if (!account.accessToken) {
    throw new Error(
      "WHATSAPP_ACCESS_TOKEN_NOT_CONFIGURED",
    );
  }

  const response = await fetch(
    graphUrl(
      `/${account.phoneNumberId}/messages`,
    ),
    {
      method: "POST",
      headers: {
        Authorization:
          `Bearer ${account.accessToken}`,
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: recipientPhone,
        type: "text",
        text: {
          preview_url: false,
          body: message,
        },
      }),
      signal: AbortSignal.timeout(15000),
    },
  );

  if (!response.ok) {
    let message =
      `WhatsApp send failed with HTTP ${response.status}.`;

    try {
      const body =
        (await response.json()) as {
          error?: {
            message?: string;
          };
        };

      message =
        body.error?.message ?? message;
    } catch {
      // Ignore malformed response.
    }

    throw new Error(message);
  }

  return response.json();
}
