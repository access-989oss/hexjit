import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { findUserById } from "./user.service.js";
import {
  requireAuth,
  type AuthenticatedRequest,
} from "../../middleware/auth.js";

const idSchema = z.string().min(1);

export async function userRoutes(app: FastifyInstance) {
  app.get(
    "/users/:id",
    {
      preHandler: requireAuth,
    },
    async (request, reply) => {
    const parsed = idSchema.safeParse(
      (request.params as { id?: unknown }).id,
    );

    if (!parsed.success) {
      return reply.code(400).send({
        success: false,
        error: "INVALID_USER_ID",
      });
    }

    const auth =
      (request as AuthenticatedRequest).auth;

    if (!auth) {
      return reply.code(401).send({
        success: false,
        error: "AUTHENTICATION_REQUIRED",
      });
    }

    if (auth.userId !== parsed.data) {
      return reply.code(403).send({
        success: false,
        error: "FORBIDDEN",
      });
    }

    const user = await findUserById(parsed.data);

    if (!user) {
      return reply.code(404).send({
        success: false,
        error: "USER_NOT_FOUND",
      });
    }

    return {
      success: true,
      data: user,
    };
  });
}
