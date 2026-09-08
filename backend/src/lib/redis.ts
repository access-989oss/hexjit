import { Redis } from "ioredis";
import { env } from "../config/env.js";

const globalForRedis = globalThis as unknown as {
  redis?: Redis;
};

export const redis =
  globalForRedis.redis ??
  new Redis({
    host: env.redis.host,
    port: env.redis.port,
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
  });

if (env.nodeEnv !== "production") {
  globalForRedis.redis = redis;
}
