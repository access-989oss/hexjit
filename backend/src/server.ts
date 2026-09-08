import rawBody from "fastify-raw-body";
import { registerWhatsAppWebhookRoutes } from "./modules/whatsapp/index.js";
import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";

import { env } from "./config/env.js";
import { prisma } from "./lib/prisma.js";
import { redis } from "./lib/redis.js";
import { healthRoutes } from "./routes/health.js";
import { apiRoutes } from "./routes/index.js";

const app = Fastify({
  logger: true,
  trustProxy: true,
})

  await app.register(rawBody, {
    field: "rawBody",
    global: false,
    encoding: "utf8",
    runFirst: true,
  });

;

await app.register(helmet);

await app.register(cors, {
  origin: true,
  credentials: true,
});

await app.register(rateLimit, {
  max: 100,
  timeWindow: "1 minute",
});

await app.register(healthRoutes);

await app.register(apiRoutes, {
  prefix: "/api/v1",
});

app.setErrorHandler((error: unknown, request, reply) => {
  request.log.error(error);

  const err =
    error instanceof Error
      ? error
      : new Error("Unknown server error");

  const statusCode =
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    typeof (error as { statusCode?: unknown }).statusCode === "number" &&
    (error as { statusCode: number }).statusCode >= 400
      ? (error as { statusCode: number }).statusCode
      : 500;

  return reply.code(statusCode).send({
    success: false,
    error:
      statusCode >= 500
        ? "INTERNAL_SERVER_ERROR"
        : err.message,
  });
});

app.setNotFoundHandler((request, reply) => {
  return reply.code(404).send({
    success: false,
    error: "ROUTE_NOT_FOUND",
    path: request.url,
  });
});

const shutdown = async (signal: string) => {
  app.log.info(`Received ${signal}; shutting down`);

  try {
    await app.close();
    await prisma.$disconnect();
    await redis.quit();
    process.exit(0);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

try {
  await registerWhatsAppWebhookRoutes(app);

  await app.listen({
    host: env.server.host,
    port: env.server.port,
  });

  app.log.info(
    `Hexjit backend running on ${env.server.host}:${env.server.port}`,
  );
} catch (error) {
  app.log.error(error);
  await prisma.$disconnect();
  redis.disconnect();
  process.exit(1);
}
