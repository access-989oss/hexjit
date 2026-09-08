import { prisma } from "../../lib/prisma.js";
import {
  generateRefreshToken,
  hashRefreshToken,
} from "../../security/tokens.js";
import { signAccessToken } from "../../security/jwt.js";

const SESSION_DAYS = 30;
const ADMIN_ROLE = "SUPER_ADMIN";

export async function createAdminSession(
  adminId: string,
) {
  const refreshToken = generateRefreshToken();
  const refreshTokenHash =
    hashRefreshToken(refreshToken);

  const session =
    await prisma.adminSession.create({
      data: {
        adminUserId: adminId,
        refreshTokenHash,
        expiresAt: new Date(
          Date.now() +
            SESSION_DAYS *
              24 *
              60 *
              60 *
              1000,
        ),
      },
    });

  const accessToken =
    await signAccessToken(
      adminId,
      "admin",
      ADMIN_ROLE,
    );

  return {
    accessToken,
    refreshToken,
    sessionId: session.id,
  };
}

export async function rotateAdminSession(
  refreshToken: string,
) {
  const tokenHash =
    hashRefreshToken(refreshToken);

  const oldSession =
    await prisma.adminSession.findFirst({
      where: {
        refreshTokenHash: tokenHash,
        revokedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

  if (!oldSession) {
    throw new Error(
      "INVALID_ADMIN_REFRESH_TOKEN",
    );
  }

  const admin =
    await prisma.adminUser.findUnique({
      where: {
        id: oldSession.adminUserId,
      },
    });

  if (!admin || !admin.isActive) {
    throw new Error(
      "ADMIN_ACCOUNT_DISABLED",
    );
  }

  const newRefreshToken =
    generateRefreshToken();

  const newRefreshTokenHash =
    hashRefreshToken(newRefreshToken);

  const newSession =
    await prisma.$transaction(
      async (tx) => {
        await tx.adminSession.update({
          where: {
            id: oldSession.id,
          },
          data: {
            revokedAt: new Date(),
          },
        });

        return tx.adminSession.create({
          data: {
            adminUserId: admin.id,
            refreshTokenHash:
              newRefreshTokenHash,
            expiresAt: new Date(
              Date.now() +
                SESSION_DAYS *
                  24 *
                  60 *
                  60 *
                  1000,
            ),
          },
        });
      },
    );

  const accessToken =
    await signAccessToken(
      admin.id,
      "admin",
      ADMIN_ROLE,
    );

  return {
    accessToken,
    refreshToken: newRefreshToken,
    sessionId: newSession.id,
  };
}

export async function revokeAdminSession(
  refreshToken: string,
) {
  const tokenHash =
    hashRefreshToken(refreshToken);

  await prisma.adminSession.updateMany({
    where: {
      refreshTokenHash: tokenHash,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
}
