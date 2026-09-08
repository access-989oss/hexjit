import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { redis } from "../lib/redis.js";

export async function healthRoutes(app: FastifyInstance) {
  app.get("/health", async () => {
    let database: "ok" | "error" = "ok";
    let redisStatus: "ok" | "error" = "ok";

    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      database = "error";
    }

    try {
      await redis.ping();
    } catch {
      redisStatus = "error";
    }

    return {
      success: database === "ok" && redisStatus === "ok",
      service: "hexjit-backend",
      database,
      redis: redisStatus,
      timestamp: new Date().toISOString(),
    };
  });

  app.get("/health/db", async (_, reply) => {
    try {
      await prisma.$queryRaw`SELECT 1`;

      return {
        success: true,
        service: "postgresql",
        status: "ok",
        timestamp: new Date().toISOString(),
      };
    } catch {
      return reply.code(503).send({
        success: false,
        service: "postgresql",
        status: "error",
      });
    }
  });

  app.get("/health/redis", async (_, reply) => {
    try {
      const result = await redis.ping();

      return {
        success: result === "PONG",
        service: "redis",
        status: result === "PONG" ? "ok" : "error",
      };
    } catch {
      return reply.code(503).send({
        success: false,
        service: "redis",
        status: "error",
      });
    }
  });
}
