import type {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import { z } from "zod";
import { requireAuth } from "../../../middleware/auth.js";
import { WhatsAppConnectorError } from "./whatsapp-connector.error.js";
import {
  createUserQrSession,
  getUserQrSessionStatus,
  getUserWhatsAppStatus,
  disconnectUserWhatsApp,
  reconnectUserWhatsApp,
} from "./whatsapp-connection.service.js";

const qrSessionQuerySchema = z.object({
  sessionId: z.string().min(1).max(200),
});

function userIdFromRequest(request: FastifyRequest): string {
  const userId = (
    request as FastifyRequest & {
      auth?: { userId?: string };
    }
  ).auth?.userId;

  if (!userId) {
    throw new WhatsAppConnectorError(
      "AUTHENTICATION_REQUIRED",
      "Authentication required.",
    );
  }

  return userId;
}

function sendConnectorError(
  error: unknown,
  reply: FastifyReply,
) {
  if (error instanceof WhatsAppConnectorError) {
    const statusCode =
      error.code.includes("FORBIDDEN")
        ? 403
        : error.code.includes("NOT_FOUND")
          ? 404
          : 400;

    return reply.code(statusCode).send({
      success: false,
      error: {
        code: error.code,
        message: error.message,
      },
    });
  }

  requestSafeErrorLog(error);

  return reply.code(500).send({
    success: false,
    error: {
      code: "WHATSAPP_CONNECTION_FAILED",
      message: "WhatsApp connection request failed.",
    },
  });
}

function requestSafeErrorLog(error: unknown) {
  if (error instanceof Error) {
    console.error(
      "[whatsapp] connection route error:",
      error.message,
    );
  } else {
    console.error(
      "[whatsapp] connection route error:",
      "unknown error",
    );
  }
}

export async function registerWhatsAppConnectionRoutes(
  app: FastifyInstance,
) {
  app.post(
    "/whatsapp/qr/session",
    {
      preHandler: requireAuth,
    },
    async (request, reply) => {
      try {
        const result = await createUserQrSession(
          userIdFromRequest(request),
        );

        return {
          success: true,
          data: result,
        };
      } catch (error) {
        return sendConnectorError(error, reply);
      }
    },
  );

  app.get(
    "/whatsapp/qr/session",
    {
      preHandler: requireAuth,
    },
    async (request, reply) => {
      const parsed =
        qrSessionQuerySchema.safeParse(request.query);

      if (!parsed.success) {
        return reply.code(400).send({
          success: false,
          error: {
            code: "INVALID_QR_SESSION_ID",
            message: "A valid sessionId is required.",
          },
        });
      }

      try {
        const result =
          await getUserQrSessionStatus(
            userIdFromRequest(request),
            parsed.data.sessionId,
          );

        return {
          success: true,
          data: result,
        };
      } catch (error) {
        return sendConnectorError(error, reply);
      }
    },
  );

  app.get(
    "/whatsapp/status",
    {
      preHandler: requireAuth,
    },
    async (request, reply) => {
      try {
        const result =
          await getUserWhatsAppStatus(
            userIdFromRequest(request),
          );

        return {
          success: true,
          data: result,
        };
      } catch (error) {
        return sendConnectorError(error, reply);
      }
    },
  );

  app.post(
    "/whatsapp/disconnect",
    {
      preHandler: requireAuth,
    },
    async (request, reply) => {
      try {
        const result =
          await disconnectUserWhatsApp(
            userIdFromRequest(request),
          );

        return {
          success: true,
          data: result,
        };
      } catch (error) {
        return sendConnectorError(error, reply);
      }
    },
  );

  app.post(
    "/whatsapp/reconnect",
    {
      preHandler: requireAuth,
    },
    async (request, reply) => {
      try {
        const result =
          await reconnectUserWhatsApp(
            userIdFromRequest(request),
          );

        return {
          success: true,
          data: result,
        };
      } catch (error) {
        return sendConnectorError(error, reply);
      }
    },
  );
}
