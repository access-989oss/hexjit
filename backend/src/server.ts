import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import dotenv from "dotenv";
import { Pool } from "pg";
import Redis from "ioredis";

dotenv.config();

const app = Fastify({
  logger: true,
});

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "0.0.0.0";

const postgres = new Pool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || "hexjit",
  user: process.env.DB_USER || "hexjit",
  password: process.env.DB_PASSWORD,
});

const redis = new Redis({
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: Number(process.env.REDIS_PORT || 6379),
});

app.register(cors, {
  origin: true,
});

app.register(helmet);

app.get("/health", async () => {
  let database = "error";
  let redisStatus = "error";

  try {
    await postgres.query("SELECT 1");
    database = "ok";
  } catch (error) {
    app.log.error(error);
  }

  try {
    await redis.ping();
    redisStatus = "ok";
  } catch (error) {
    app.log.error(error);
  }

  return {
    success: database === "ok" && redisStatus === "ok",
    service: "hexjit-backend",
    database,
    redis: redisStatus,
    timestamp: new Date().toISOString(),
  };
});

app.get("/", async () => {
  return {
    name: "Hexjit",
    service: "Backend API",
    status: "running",
  };
});

const start = async () => {
  try {
    await app.listen({
      port: PORT,
      host: HOST,
    });

    app.log.info(`Hexjit backend running on ${HOST}:${PORT}`);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

const shutdown = async () => {
  await app.close();
  await postgres.end();
  await redis.quit();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

start();
