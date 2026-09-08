import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "../config/env.js";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const connectionString =
  `postgresql://${encodeURIComponent(env.database.user)}:` +
  `${encodeURIComponent(env.database.password)}@` +
  `${env.database.host}:${env.database.port}/` +
  `${env.database.name}?schema=public`;

const adapter = new PrismaPg({
  connectionString,
});

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: ["error", "warn"],
  });

if (env.nodeEnv !== "production") {
  globalForPrisma.prisma = prisma;
}
