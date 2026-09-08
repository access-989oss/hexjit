import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { prisma } from "../src/lib/prisma.js";
import { hashPassword } from "../src/security/password.js";

const rl = readline.createInterface({
  input,
  output,
});

async function main() {
  const email = (
    await rl.question("Super Admin email: ")
  )
    .trim()
    .toLowerCase();

  const password = await rl.question(
    "Super Admin password: ",
    {
      hideEchoBack: true,
    },
  );

  if (!email) {
    throw new Error("Email is required.");
  }

  if (!password) {
    throw new Error("Password is required.");
  }

  if (password.length < 12) {
    throw new Error(
      "Super Admin password must be at least 12 characters.",
    );
  }

  const passwordHash = await hashPassword(password);

  const admin = await prisma.adminUser.upsert({
    where: {
      email,
    },
    update: {
      passwordHash,
      isActive: true,
    },
    create: {
      email,
      passwordHash,
      isActive: true,
    },
    select: {
      id: true,
      email: true,
      isActive: true,
      createdAt: true,
      lastLoginAt: true,
    },
  });

  console.log(
    JSON.stringify(
      {
        success: true,
        admin,
        role: "SUPER_ADMIN",
      },
      null,
      2,
    ),
  );
}

try {
  await main();
} catch (error) {
  console.error(
    error instanceof Error
      ? error.message
      : "ADMIN_BOOTSTRAP_FAILED",
  );
  process.exitCode = 1;
} finally {
  rl.close();
  await prisma.$disconnect();
}
