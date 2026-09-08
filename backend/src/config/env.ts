import dotenv from "dotenv";

dotenv.config();

function required(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}`,
    );
  }

  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",

  server: {
    host: process.env.HOST || "0.0.0.0",
    port: Number(process.env.PORT || 3000),
  },

  database: {
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 5432),
    name: required("DB_NAME"),
    user: required("DB_USER"),
    password: required("DB_PASSWORD"),
  },

  redis: {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: Number(process.env.REDIS_PORT || 6379),
  },

  jwt: {
    accessSecret: required("JWT_ACCESS_SECRET"),
    refreshSecret: required("JWT_REFRESH_SECRET"),
    issuer: process.env.JWT_ISSUER || "hexjit",
    audience: process.env.JWT_AUDIENCE || "hexjit-api",
  },

  ai: {
    encryptionKey: required("AI_ENCRYPTION_KEY"),
  },

  google: {
    clientIds: (process.env.GOOGLE_CLIENT_IDS || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  },

  whatsapp: {
    webhookVerifyToken:
      process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ?? "",
    appSecret:
      process.env.WHATSAPP_APP_SECRET ?? "",
    graphVersion:
      process.env.META_GRAPH_VERSION ?? "v23.0",
  },
};
