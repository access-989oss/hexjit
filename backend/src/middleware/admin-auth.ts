import type {
  FastifyReply,
  FastifyRequest,
} from "fastify";
import { verifyAccessToken } from "../security/jwt.js";

export type AdminRequest =
  FastifyRequest & {
    adminAuth?: {
      adminId: string;
      role: string;
    };
  };

export async function requireAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const header =
    request.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    return reply.code(401).send({
      success: false,
      error:
        "ADMIN_AUTHENTICATION_REQUIRED",
    });
  }

  const token =
    header.slice("Bearer ".length).trim();

  try {
    const payload =
      await verifyAccessToken(token);

    if (
      payload.type !== "access" ||
      payload.principal !== "admin" ||
      !payload.sub
    ) {
      return reply.code(403).send({
        success: false,
        error: "ADMIN_ACCESS_REQUIRED",
      });
    }

    const role =
      typeof payload.role === "string"
        ? payload.role
        : "";

    if (role !== "SUPER_ADMIN") {
      return reply.code(403).send({
        success: false,
        error:
          "INSUFFICIENT_ADMIN_ROLE",
      });
    }

    const admin =
      await prismaAdminCheck(payload.sub);

    if (!admin) {
      return reply.code(401).send({
        success: false,
        error:
          "ADMIN_ACCOUNT_DISABLED",
      });
    }

    (
      request as AdminRequest
    ).adminAuth = {
      adminId: payload.sub,
      role,
    };
  } catch {
    return reply.code(401).send({
      success: false,
      error:
        "INVALID_OR_EXPIRED_ADMIN_TOKEN",
    });
  }
}

async function prismaAdminCheck(
  adminId: string,
) {
  const { prisma } =
    await import("../lib/prisma.js");

  const admin =
    await prisma.adminUser.findUnique({
      where: {
        id: adminId,
      },
      select: {
        isActive: true,
      },
    });

  return admin?.isActive === true;
}
