import crypto from "node:crypto";
import { env } from "../../../config/env.js";

const algorithm = "aes-256-gcm";

function getKey() {
  return crypto
    .createHash("sha256")
    .update(env.ai.encryptionKey, "utf8")
    .digest();
}

export function encryptWhatsAppSecret(value: string) {
  const iv = crypto.randomBytes(12);

  const cipher = crypto.createCipheriv(
    algorithm,
    getKey(),
    iv,
  );

  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);

  const tag = cipher.getAuthTag();

  return [
    iv.toString("base64url"),
    tag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

export function decryptWhatsAppSecret(value: string) {
  const [ivRaw, tagRaw, encryptedRaw] =
    value.split(".");

  if (!ivRaw || !tagRaw || !encryptedRaw) {
    throw new Error("INVALID_WHATSAPP_SECRET");
  }

  const decipher = crypto.createDecipheriv(
    algorithm,
    getKey(),
    Buffer.from(ivRaw, "base64url"),
  );

  decipher.setAuthTag(
    Buffer.from(tagRaw, "base64url"),
  );

  const decrypted = Buffer.concat([
    decipher.update(
      Buffer.from(encryptedRaw, "base64url"),
    ),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}
