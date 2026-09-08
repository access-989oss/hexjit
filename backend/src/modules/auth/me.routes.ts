import type { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma.js";
import {
  requireAuth,
  type AuthenticatedRequest,
} from "../../middleware/auth.js";

export async function meRoutes(app: FastifyInstance) {
  app.get(
    "/auth/me",
    {
      preHandler: requireAuth,
    },
    async (request, reply) => {
      const auth = (request as AuthenticatedRequest).auth;

      if (!auth) {
        return reply.code(401).send({
          success: false,
          error: "AUTHENTICATION_REQUIRED",
        });
      }

      const user = await prisma.user.findUnique({
        where: {
          id: auth.userId,
        },
        select: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          lastLoginAt: true,
        },
      });

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
    },
  );
}
