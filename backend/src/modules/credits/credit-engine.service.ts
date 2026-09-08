import type {
  CreditCapability,
  CreditOperation,
  CreditSnapshot,
} from "./credit.types.js";

import { prisma } from "../../lib/prisma.js";

function validateAmount(
  amount: number,
): number {
  if (
    !Number.isFinite(amount) ||
    amount < 0
  ) {
    throw new Error(
      "CREDIT_INVALID_AMOUNT",
    );
  }

  return amount;
}

async function findAccount(
  userId: string,
) {
  return prisma.creditAccount.findUnique({
    where: {
      userId,
    },
  });
}

async function ensureAccount(
  userId: string,
) {
  const existing =
    await findAccount(userId);

  if (existing) {
    return existing;
  }

  return prisma.creditAccount.create({
    data: {
      userId,
      balance: 0,
      lifetimeUsed: 0,
    },
  });
}

export async function getCreditSnapshot(
  userId: string,
): Promise<CreditSnapshot> {
  const account =
    await ensureAccount(userId);

  return {
    balance: Number(
      account.balance,
    ),
    lifetimeUsed: Number(
      account.lifetimeUsed,
    ),
  };
}

export async function getAvailableCredits(
  userId: string,
): Promise<number> {
  const snapshot =
    await getCreditSnapshot(userId);

  return snapshot.balance;
}

export async function reserveCredits(
  input: CreditOperation,
): Promise<void> {
  const amount =
    validateAmount(input.amount);

  if (amount === 0) {
    return;
  }

  const result =
    await prisma.creditAccount.updateMany({
      where: {
        userId:
          input.userId,
        balance: {
          gte: amount,
        },
      },
      data: {
        balance: {
          decrement: amount,
        },
      },
    });

  if (result.count !== 1) {
    throw new Error(
      "HEXJIT_INSUFFICIENT_CREDITS",
    );
  }
}

export async function commitCredits(
  input: CreditOperation,
): Promise<void> {
  const amount =
    validateAmount(input.amount);

  if (amount === 0) {
    return;
  }

  /*
   * Reservation already reduced balance.
   *
   * Commit moves the consumed amount into
   * lifetimeUsed.
   */
  await prisma.creditAccount.update({
    where: {
      userId:
        input.userId,
    },
    data: {
      lifetimeUsed: {
        increment: amount,
      },
    },
  });
}

export async function releaseCredits(
  input: CreditOperation,
): Promise<void> {
  const amount =
    validateAmount(input.amount);

  if (amount === 0) {
    return;
  }

  await prisma.creditAccount.update({
    where: {
      userId:
        input.userId,
    },
    data: {
      balance: {
        increment: amount,
      },
    },
  });
}


/*
 * Default V1 credit pricing.
 *
 * Super Admin configuration will replace this resolver
 * later without changing AI Gateway contracts.
 */
const DEFAULT_COSTS: Record<
  CreditCapability,
  number
> = {
  text: 1,
  image: 1,
  vision: 1,
  speech_to_text: 1,
  text_to_speech: 1,
  video: 1,
};

export async function getCreditCost(
  capability: CreditCapability,
): Promise<number> {
  return (
    DEFAULT_COSTS[capability] ??
    1
  );
}
