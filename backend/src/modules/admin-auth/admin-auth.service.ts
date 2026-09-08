import { prisma } from "../../lib/prisma.js";
import { verifyPassword } from "../../security/password.js";
import {
  createAdminSession,
} from "./admin-session.service.js";

const ADMIN_ROLE = "SUPER_ADMIN";

export async function loginAdmin(
  email: string,
  password: string,
) {
  const normalizedEmail =
    email.toLowerCase().trim();

  const admin =
    await prisma.adminUser.findUnique({
      where: {
        email: normalizedEmail,
      },
    });

  if (!admin || !admin.isActive) {
    throw new Error(
      "INVALID_ADMIN_CREDENTIALS",
    );
  }

  const valid =
    await verifyPassword(
      password,
      admin.passwordHash,
    );

  if (!valid) {
    throw new Error(
      "INVALID_ADMIN_CREDENTIALS",
    );
  }

  await prisma.adminUser.update({
    where: {
      id: admin.id,
    },
    data: {
      lastLoginAt: new Date(),
    },
  });

  const session =
    await createAdminSession(
      admin.id,
    );

  return {
    admin: {
      id: admin.id,
      email: admin.email,
      role: ADMIN_ROLE,
      isActive: admin.isActive,
    },
    ...session,
  };
}
