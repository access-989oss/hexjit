import { OAuth2Client } from "google-auth-library";
import { prisma } from "../../lib/prisma.js";
import { env } from "../../config/env.js";
import { createUserSession } from "./session.service.js";

const googleClient = new OAuth2Client();

export async function loginWithGoogle(
  idToken: string,
) {
  if (env.google.clientIds.length === 0) {
    throw new Error(
      "GOOGLE_OAUTH_NOT_CONFIGURED",
    );
  }

  const ticket =
    await googleClient.verifyIdToken({
      idToken,
      audience: env.google.clientIds,
    });

  const payload = ticket.getPayload();

  if (!payload) {
    throw new Error("INVALID_GOOGLE_TOKEN");
  }

  if (
    payload.iss !==
      "https://accounts.google.com" &&
    payload.iss !== "accounts.google.com"
  ) {
    throw new Error("INVALID_GOOGLE_ISSUER");
  }

  if (!payload.sub) {
    throw new Error(
      "GOOGLE_SUBJECT_MISSING",
    );
  }

  if (!payload.email) {
    throw new Error(
      "GOOGLE_EMAIL_MISSING",
    );
  }

  if (payload.email_verified !== true) {
    throw new Error(
      "GOOGLE_EMAIL_NOT_VERIFIED",
    );
  }

  const email =
    payload.email.toLowerCase().trim();

  let user =
    await prisma.user.findFirst({
      where: {
        OR: [
          {
            googleSubject:
              payload.sub,
          },
          {
            email,
          },
        ],
      },
    });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        name: payload.name ?? null,
        avatarUrl:
          payload.picture ?? null,
        googleSubject:
          payload.sub,
        status: "ACTIVE",
      },
    });
  } else {
    if (
      user.googleSubject &&
      user.googleSubject !== payload.sub
    ) {
      throw new Error(
        "GOOGLE_ACCOUNT_MISMATCH",
      );
    }

    user = await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        googleSubject:
          payload.sub,
        name:
          payload.name ??
          user.name,
        avatarUrl:
          payload.picture ??
          user.avatarUrl,
      },
    });
  }

  if (user.status !== "ACTIVE") {
    throw new Error(
      "USER_ACCOUNT_DISABLED",
    );
  }

  await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      lastLoginAt: new Date(),
    },
  });

  const session =
    await createUserSession(user.id);

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      status: user.status,
    },
    ...session,
  };
}
