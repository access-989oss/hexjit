import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { env } from "../config/env.js";

const accessSecret = new TextEncoder().encode(
  env.jwt.accessSecret,
);

export type PrincipalType = "user" | "admin";

export type AccessTokenPayload = JWTPayload & {
  sub: string;
  type: "access";
  principal: PrincipalType;
  role?: string;
};

export async function signAccessToken(
  subjectId: string,
  principal: PrincipalType,
  role?: string,
): Promise<string> {
  return new SignJWT({
    type: "access",
    principal,
    ...(role ? { role } : {}),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(subjectId)
    .setIssuer(env.jwt.issuer)
    .setAudience(env.jwt.audience)
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(accessSecret);
}

export async function verifyAccessToken(
  token: string,
): Promise<AccessTokenPayload> {
  const result = await jwtVerify(token, accessSecret, {
    issuer: env.jwt.issuer,
    audience: env.jwt.audience,
  });

  return result.payload as AccessTokenPayload;
}
