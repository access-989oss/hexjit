import type { FastifyInstance } from "fastify";
import { adminLoginSchema } from "./admin-auth.schemas.js";
import { loginAdmin } from "./admin-auth.service.js";
import {
  refreshTokenSchema,
  logoutSchema,
} from "../auth/auth.schemas.js";
import {
  rotateAdminSession,
  revokeAdminSession,
} from "./admin-session.service.js";

export async function adminAuthRoutes(
  app: FastifyInstance,
) {
  app.post(
    "/admin/auth/login",
    async (request, reply) => {
      const parsed =
        adminLoginSchema.safeParse(
          request.body,
        );

      if (!parsed.success) {
        return reply.code(400).send({
          success: false,
          error: "INVALID_ADMIN_LOGIN",
        });
      }

      try {
        const result =
          await loginAdmin(
            parsed.data.email,
            parsed.data.password,
          );

        return {
          success: true,
          data: result,
        };
      } catch {
        return reply.code(401).send({
          success: false,
          error:
            "INVALID_ADMIN_CREDENTIALS",
        });
      }
    },
  );

  app.post(
    "/admin/auth/refresh",
    async (request, reply) => {
      const parsed =
        refreshTokenSchema.safeParse(
          request.body,
        );

      if (!parsed.success) {
        return reply.code(400).send({
          success: false,
          error:
            "INVALID_ADMIN_REFRESH_TOKEN",
        });
      }

      try {
        const result =
          await rotateAdminSession(
            parsed.data.refreshToken,
          );

        return {
          success: true,
          data: result,
        };
      } catch {
        return reply.code(401).send({
          success: false,
          error:
            "INVALID_ADMIN_REFRESH_TOKEN",
        });
      }
    },
  );

  app.post(
    "/admin/auth/logout",
    async (request, reply) => {
      const parsed =
        logoutSchema.safeParse(
          request.body,
        );

      if (!parsed.success) {
        return reply.code(400).send({
          success: false,
          error:
            "INVALID_ADMIN_REFRESH_TOKEN",
        });
      }

      await revokeAdminSession(
        parsed.data.refreshToken,
      );

      return {
        success: true,
        message: "Admin logged out successfully",
      };
    },
  );

  app.get(
    "/admin/auth/status",
    async () => ({
      success: true,
      authentication: "email_password",
      configured: true,
      refreshTokens: {
        configured: true,
        rotation: true,
      },
    }),
  );
}
