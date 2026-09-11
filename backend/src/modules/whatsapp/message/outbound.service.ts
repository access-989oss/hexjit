import {
  getWhatsAppAccountSecret,
} from "../account/account.service.js";
import { prisma } from "../../../lib/prisma.js";
import { getWhatsAppConnector } from "../connector/whatsapp-connector.factory.js";

const GRAPH_VERSION =
  process.env.META_GRAPH_VERSION ?? "v23.0";

function graphUrl(
  path: string,
) {
  return `https://graph.facebook.com/${GRAPH_VERSION}${path}`;
}

export async function sendWhatsAppTextMessage(input: {
  accountId: string;
  recipientPhone: string;
  text: string;
}) {
  if (!input.text.trim()) {
    throw new Error(
      "WHATSAPP_MESSAGE_EMPTY",
    );
  }

  const connectorAccount = await prisma.whatsAppAccount.findUnique({
    where: {
      id: input.accountId,
    },
    select: {
      id: true,
      connectorType: true,
    },
  });

  if (!connectorAccount) {
    throw new Error(
      "WHATSAPP_ACCOUNT_NOT_FOUND",
    );
  }

  if (connectorAccount.connectorType === "BAILEYS") {
    const result = await getWhatsAppConnector().sendText({
      accountId: input.accountId,
      to: input.recipientPhone,
      text: input.text,
    });

    return {
      success: true,
      externalMessageId: result.externalMessageId,
    };
  }

  const account =
    await getWhatsAppAccountSecret(
      input.accountId,
    );

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
        to: input.recipientPhone,
        type: "text",
        text: {
          preview_url: false,
          body: input.text,
        },
      }),
      signal: AbortSignal.timeout(15000),
    },
  );

  let responseBody: unknown = null;

  try {
    responseBody = await response.json();
  } catch {
    responseBody = null;
  }

  if (!response.ok) {
    const body =
      responseBody as {
        error?: {
          message?: string;
          code?: number;
          type?: string;
        };
      } | null;

    throw new Error(
      body?.error?.message ??
        `WhatsApp API returned HTTP ${response.status}.`,
    );
  }

  return responseBody;
}
