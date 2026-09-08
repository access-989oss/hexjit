import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { env } from "../config/env.js";

const key = createHash("sha256")
  .update(env.ai.encryptionKey)
  .digest();

const algorithm = "aes-256-gcm";

export function encryptSecret(
  value: string,
): string {
  const iv = randomBytes(12);

  const cipher = createCipheriv(
    algorithm,
    key,
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

export function decryptSecret(
  value: string,
): string {
  const parts = value.split(".");

  if (parts.length !== 3) {
    throw new Error(
      "INVALID_ENCRYPTED_SECRET",
    );
  }

  const [ivPart, tagPart, encryptedPart] =
    parts;

  const iv = Buffer.from(
    ivPart,
    "base64url",
  );

  const tag = Buffer.from(
    tagPart,
    "base64url",
  );

  const encrypted = Buffer.from(
    encryptedPart,
    "base64url",
  );

  const decipher = createDecipheriv(
    algorithm,
    key,
    iv,
  );

  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}
