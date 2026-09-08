import type { FastifyReply, FastifyRequest } from "fastify";
import { verifyAccessToken } from "../security/jwt.js";

export type AuthenticatedRequest = FastifyRequest & {
  auth?: {
    userId: string;
    role?: string;
  };
};

export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const header = request.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    return reply.code(401).send({
      success: false,
      error: "AUTHENTICATION_REQUIRED",
    });
  }

  const token = header.slice("Bearer ".length).trim();

  try {
    const payload = await verifyAccessToken(token);

    if (!payload.sub || payload.type !== "access") {
      return reply.code(401).send({
        success: false,
        error: "INVALID_ACCESS_TOKEN",
      });
    }

    const authenticatedRequest = request as AuthenticatedRequest;

    authenticatedRequest.auth = {
      userId: payload.sub,
      role:
        typeof payload.role === "string"
          ? payload.role
          : undefined,
    };
  } catch {
    return reply.code(401).send({
      success: false,
      error: "INVALID_OR_EXPIRED_ACCESS_TOKEN",
    });
  }
}
