import { prisma } from "../../lib/prisma.js";
import {
  generateRefreshToken,
  hashRefreshToken,
} from "../../security/tokens.js";
import { signAccessToken } from "../../security/jwt.js";

const SESSION_DAYS = 30;

export async function createUserSession(userId: string) {
  const refreshToken = generateRefreshToken();
  const refreshTokenHash = hashRefreshToken(refreshToken);

  const session = await prisma.session.create({
    data: {
      userId,
      refreshTokenHash,
      expiresAt: new Date(
        Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000,
      ),
    },
  });

  const accessToken = await signAccessToken(
    userId,
    "user",
  );

  return {
    accessToken,
    refreshToken,
    sessionId: session.id,
  };
}

export async function rotateUserSession(
  refreshToken: string,
) {
  const tokenHash = hashRefreshToken(refreshToken);

  const oldSession = await prisma.session.findFirst({
    where: {
      refreshTokenHash: tokenHash,
      revokedAt: null,
      expiresAt: {
        gt: new Date(),
      },
    },
  });

  if (!oldSession) {
    throw new Error("INVALID_REFRESH_TOKEN");
  }

  const user = await prisma.user.findUnique({
    where: {
      id: oldSession.userId,
    },
  });

  if (!user || user.status !== "ACTIVE") {
    throw new Error("USER_ACCOUNT_DISABLED");
  }

  const newRefreshToken = generateRefreshToken();
  const newRefreshTokenHash =
    hashRefreshToken(newRefreshToken);

  const newSession = await prisma.$transaction(
    async (tx) => {
      await tx.session.update({
        where: {
          id: oldSession.id,
        },
        data: {
          revokedAt: new Date(),
        },
      });

      return tx.session.create({
        data: {
          userId: user.id,
          refreshTokenHash:
            newRefreshTokenHash,
          expiresAt: new Date(
            Date.now() +
              SESSION_DAYS * 24 * 60 * 60 * 1000,
          ),
        },
      });
    },
  );

  const accessToken = await signAccessToken(
    user.id,
    "user",
  );

  return {
    accessToken,
    refreshToken: newRefreshToken,
    sessionId: newSession.id,
    userId: user.id,
  };
}

export async function revokeUserSession(
  refreshToken: string,
) {
  const tokenHash = hashRefreshToken(refreshToken);

  await prisma.session.updateMany({
    where: {
      refreshTokenHash: tokenHash,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
}
