import { prisma } from "../../lib/prisma.js";
import {
  generateRefreshToken,
  hashRefreshToken,
} from "../../security/tokens.js";

export async function createUserSession(userId: string) {
  const refreshToken = generateRefreshToken();
  const refreshTokenHash = hashRefreshToken(refreshToken);

  const session = await prisma.session.create({
    data: {
      userId,
      refreshTokenHash,
      expiresAt: new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000,
      ),
    },
  });

  return {
    sessionId: session.id,
    refreshToken,
  };
}

export async function revokeSessionByRefreshToken(
  refreshToken: string,
) {
  const refreshTokenHash = hashRefreshToken(refreshToken);

  await prisma.session.updateMany({
    where: {
      refreshTokenHash,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
}

export async function findSessionByRefreshToken(
  refreshToken: string,
) {
  const refreshTokenHash = hashRefreshToken(refreshToken);

  return prisma.session.findFirst({
    where: {
      refreshTokenHash,
      revokedAt: null,
      expiresAt: {
        gt: new Date(),
      },
    },
  });
}
