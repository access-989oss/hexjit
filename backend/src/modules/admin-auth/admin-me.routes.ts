import type { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma.js";
import {
  requireAdmin,
  type AdminRequest,
} from "../../middleware/admin-auth.js";

export async function adminMeRoutes(
  app: FastifyInstance,
) {
  app.get(
    "/admin/auth/me",
    {
      preHandler: requireAdmin,
    },
    async (request, reply) => {
      const auth =
        (request as AdminRequest).adminAuth;

      if (!auth) {
        return reply.code(401).send({
          success: false,
          error:
            "ADMIN_AUTHENTICATION_REQUIRED",
        });
      }

      const admin =
        await prisma.adminUser.findUnique({
          where: {
            id: auth.adminId,
          },
          select: {
            id: true,
            email: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
            lastLoginAt: true,
          },
        });

      if (!admin || !admin.isActive) {
        return reply.code(401).send({
          success: false,
          error:
            "ADMIN_ACCOUNT_DISABLED",
        });
      }

      return {
        success: true,
        data: {
          ...admin,
          role: "SUPER_ADMIN",
        },
      };
    },
  );
}
