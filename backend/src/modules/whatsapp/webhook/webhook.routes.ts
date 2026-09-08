import type { FastifyInstance } from "fastify";

import {
  verifyWebhookChallenge,
  verifyMetaSignature,
} from "./webhook-security.service.js";

import {
  saveWebhookEvent,
  markWebhookProcessed,
  markWebhookFailed,
} from "./webhook.service.js";

import {
  processNormalizedMessages,
} from "../normalizer/index.js";

import {
  findWhatsAppAccountByPhoneNumberId,
} from "../account/account-lookup.service.js";

type WebhookQuery = {
  "hub.mode"?: string;
  "hub.verify_token"?: string;
  "hub.challenge"?: string;
};

type WebhookPayload = {
  object?: string;
  entry?: Array<{
    id?: string;
    changes?: Array<{
      field?: string;
      value?: unknown;
    }>;
  }>;
};

type RawBodyRequest = {
  rawBody?: string;
};

function getPhoneNumberId(
  payload: WebhookPayload,
): string | undefined {
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (
        !change ||
        typeof change.value !== "object" ||
        change.value === null
      ) {
        continue;
      }

      const value =
        change.value as Record<string, unknown>;

      if (
        typeof value.metadata !== "object" ||
        value.metadata === null
      ) {
        continue;
      }

      const metadata =
        value.metadata as Record<string, unknown>;

      if (
        typeof metadata.phone_number_id ===
        "string"
      ) {
        return metadata.phone_number_id;
      }
    }
  }

  return undefined;
}

function createEventId(
  rawBody: string,
): string {
  return (
    "wh_" +
    cryptoHash(rawBody)
  );
}

function cryptoHash(
  value: string,
): string {
  let hash = 0;

  for (let i = 0; i < value.length; i++) {
    hash =
      (hash << 5) -
      hash +
      value.charCodeAt(i);

    hash |= 0;
  }

  return Math.abs(hash).toString(36);
}

export async function registerWhatsAppWebhookRoutes(
  app: FastifyInstance,
) {
  app.get(
    "/whatsapp/webhook",
    async (
      request,
      reply,
    ) => {
      const query =
        request.query as WebhookQuery;

      if (
        !verifyWebhookChallenge(
          query["hub.mode"],
          query["hub.verify_token"],
        )
      ) {
        return reply.code(403).send({
          success: false,
          error: {
            code:
              "WHATSAPP_WEBHOOK_VERIFICATION_FAILED",
            message:
              "Webhook verification failed.",
          },
        });
      }

      return reply
        .code(200)
        .type("text/plain")
        .send(
          query["hub.challenge"] ?? "",
        );
    },
  );

  app.post(
    "/whatsapp/webhook",
    async (
      request,
      reply,
    ) => {
      const rawRequest =
        request as typeof request &
          RawBodyRequest;

      const rawBody =
        rawRequest.rawBody;

      if (
        typeof rawBody !== "string"
      ) {
        return reply.code(400).send({
          success: false,
          error: {
            code:
              "WHATSAPP_RAW_BODY_UNAVAILABLE",
            message:
              "Webhook raw body unavailable.",
          },
        });
      }

      const signature =
        request.headers[
          "x-hub-signature-256"
        ];

      const signatureHeader =
        Array.isArray(signature)
          ? signature[0]
          : signature;

      if (
        !verifyMetaSignature(
          rawBody,
          signatureHeader,
        )
      ) {
        return reply.code(401).send({
          success: false,
          error: {
            code:
              "WHATSAPP_WEBHOOK_SIGNATURE_INVALID",
            message:
              "Invalid webhook signature.",
          },
        });
      }

      const payload =
        request.body as WebhookPayload;

      const phoneNumberId =
        getPhoneNumberId(payload);

      let accountId:
        string | undefined;

      if (phoneNumberId) {
        const account =
          await findWhatsAppAccountByPhoneNumberId(
            phoneNumberId,
          );

        accountId =
          account?.id;
      }

      const eventId =
        createEventId(rawBody);

      const existingEvent =
        await saveWebhookEvent({
          eventId,
          accountId,
          eventType:
            payload.object ?? "unknown",
          payload,
        });

      if (existingEvent.processed) {
        return reply.code(200).send({
          success: true,
          duplicate: true,
        });
      }

      try {
        if (accountId) {
          await processNormalizedMessages(
            accountId,
            payload,
          );
        }

        await markWebhookProcessed(
          eventId,
        );

        return reply.code(200).send({
          success: true,
          accountMapped:
            Boolean(accountId),
        });
      } catch (error) {
        await markWebhookFailed(
          eventId,
          error instanceof Error
            ? error.message
            : "Webhook processing failed.",
        );

        return reply.code(500).send({
          success: false,
          error: {
            code:
              "WHATSAPP_WEBHOOK_PROCESSING_FAILED",
            message:
              "Webhook processing failed.",
          },
        });
      }
    },
  );
}
