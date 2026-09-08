import crypto from "node:crypto";
import { env } from "../../../config/env.js";

function safeEqual(
  a: string,
  b: string,
): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");

  if (left.length !== right.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    left,
    right,
  );
}

export function verifyWebhookChallenge(
  mode: string | undefined,
  token: string | undefined,
): boolean {
  if (mode !== "subscribe") {
    return false;
  }

  if (!env.whatsapp.webhookVerifyToken) {
    return false;
  }

  if (!token) {
    return false;
  }

  return safeEqual(
    token,
    env.whatsapp.webhookVerifyToken,
  );
}

export function verifyMetaSignature(
  rawBody: string,
  signatureHeader: string | undefined,
): boolean {
  if (!env.whatsapp.appSecret) {
    return false;
  }

  if (!signatureHeader) {
    return false;
  }

  const prefix = "sha256=";

  if (!signatureHeader.startsWith(prefix)) {
    return false;
  }

  const received =
    signatureHeader.slice(prefix.length);

  if (!/^[a-f0-9]{64}$/i.test(received)) {
    return false;
  }

  const expected =
    crypto
      .createHmac(
        "sha256",
        env.whatsapp.appSecret,
      )
      .update(rawBody, "utf8")
      .digest("hex");

  return safeEqual(
    received.toLowerCase(),
    expected.toLowerCase(),
  );
}
