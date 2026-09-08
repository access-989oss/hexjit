import { prisma } from "../../lib/prisma.js";

export async function findUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      avatarUrl: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      lastLoginAt: true,
    },
  });
}

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      avatarUrl: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      lastLoginAt: true,
    },
  });
}
