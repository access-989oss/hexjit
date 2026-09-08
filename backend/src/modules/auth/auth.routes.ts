import type { FastifyInstance } from "fastify";
import { env } from "../../config/env.js";
import { prisma } from "../../lib/prisma.js";
import {
  googleAuthSchema,
  refreshTokenSchema,
  logoutSchema,
} from "./auth.schemas.js";
import { loginWithGoogle } from "./google-auth.service.js";
import {
  rotateUserSession,
  revokeUserSession,
} from "./session.service.js";

export async function authRoutes(
  app: FastifyInstance,
) {
  app.post("/auth/google", async (request, reply) => {
    const parsed =
      googleAuthSchema.safeParse(
        request.body,
      );

    if (!parsed.success) {
      return reply.code(400).send({
        success: false,
        error: "INVALID_GOOGLE_TOKEN",
      });
    }

    try {
      const result =
        await loginWithGoogle(
          parsed.data.idToken,
        );

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "GOOGLE_AUTH_FAILED";

      if (
        message ===
        "GOOGLE_OAUTH_NOT_CONFIGURED"
      ) {
        return reply.code(503).send({
          success: false,
          error: message,
        });
      }

      return reply.code(401).send({
        success: false,
        error: message,
      });
    }
  });

  app.post("/auth/refresh", async (request, reply) => {
    const parsed =
      refreshTokenSchema.safeParse(
        request.body,
      );

    if (!parsed.success) {
      return reply.code(400).send({
        success: false,
        error: "INVALID_REFRESH_TOKEN",
      });
    }

    try {
      const result =
        await rotateUserSession(
          parsed.data.refreshToken,
        );

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "REFRESH_AUTH_FAILED";

      return reply.code(401).send({
        success: false,
        error: message,
      });
    }
  });

  app.post("/auth/logout", async (request, reply) => {
    const parsed =
      logoutSchema.safeParse(
        request.body,
      );

    if (!parsed.success) {
      return reply.code(400).send({
        success: false,
        error: "INVALID_REFRESH_TOKEN",
      });
    }

    await revokeUserSession(
      parsed.data.refreshToken,
    );

    return {
      success: true,
      message: "Logged out successfully",
    };
  });

  app.get("/auth/status", async () => {
    return {
      success: true,
      provider: "google",
      googleOAuth: {
        configured:
          env.google.clientIds.length > 0,
      },
      jwt: {
        configured: true,
      },
      refreshTokens: {
        configured: true,
        rotation: true,
      },
    };
  });

  app.get("/auth/sessions/count", async () => {
    const count =
      await prisma.session.count({
        where: {
          revokedAt: null,
          expiresAt: {
            gt: new Date(),
          },
        },
      });

    return {
      success: true,
      count,
    };
  });
}
