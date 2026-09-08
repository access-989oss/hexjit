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
    !Number.isInteger(amount) ||
    amount < 0
  ) {
    throw new Error(
      "CREDIT_INVALID_AMOUNT",
    );
  }

  return amount;
}

function startOfTodayUtc(): Date {
  const now = new Date();

  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
    ),
  );
}

function nextUtcDay(): Date {
  const value =
    startOfTodayUtc();

  value.setUTCDate(
    value.getUTCDate() + 1,
  );

  return value;
}

async function ensureAccount(
  userId: string,
) {
  const existing =
    await prisma.creditAccount.findUnique({
      where: {
        userId,
      },
    });

  if (existing) {
    return existing;
  }

  return prisma.creditAccount.create({
    data: {
      userId,
      balance: 500,
      dailyLimit: 500,
      dailyUsed: 0,
      dailyResetAt: nextUtcDay(),
      unlimited: false,
      isSuspended: false,
      lifetimeUsed: 0,
    },
  });
}

async function normalizeDailyState(
  tx: Parameters<
    Parameters<typeof prisma.$transaction>[0]
  >[0],
  account: {
    id: string;
    dailyResetAt: Date;
    dailyUsed: number;
  },
) {
  if (
    account.dailyResetAt <= new Date()
  ) {
    await tx.creditAccount.update({
      where: {
        id: account.id,
      },
      data: {
        dailyUsed: 0,
        dailyResetAt:
          nextUtcDay(),
      },
    });

    return 0;
  }

  return account.dailyUsed;
}

export async function getCreditSnapshot(
  userId: string,
): Promise<CreditSnapshot> {
  const account =
    await ensureAccount(userId);

  if (
    account.dailyResetAt <= new Date()
  ) {
    const reset =
      await prisma.creditAccount.update({
        where: {
          id: account.id,
        },
        data: {
          dailyUsed: 0,
          dailyResetAt:
            nextUtcDay(),
        },
      });

    return {
      balance: reset.balance,
      lifetimeUsed: Number(
        reset.lifetimeUsed,
      ),
    };
  }

  return {
    balance: account.balance,
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

  /*
   * Zero-cost operations still get an operation record.
   * This prevents duplicate execution paths from treating
   * the same operation inconsistently.
   */
  await prisma.$transaction(
    async (tx) => {
      const existing =
        await tx.creditOperation.findUnique({
          where: {
            operationId:
              input.operationId,
          },
        });

      if (existing) {
        if (
          existing.status ===
          "RESERVED"
        ) {
          return;
        }

        if (
          existing.status ===
          "COMMITTED"
        ) {
          return;
        }

        if (
          existing.status ===
          "RELEASED"
        ) {
          throw new Error(
            "CREDIT_OPERATION_ALREADY_RELEASED",
          );
        }
      }

      const account =
        await tx.creditAccount.findUnique({
          where: {
            userId:
              input.userId,
          },
        });

      if (!account) {
        throw new Error(
          "CREDIT_ACCOUNT_NOT_FOUND",
        );
      }

      if (account.isSuspended) {
        throw new Error(
          "CREDIT_ACCOUNT_SUSPENDED",
        );
      }

      const dailyUsed =
        await normalizeDailyState(
          tx,
          account,
        );

      if (
        !account.unlimited &&
        dailyUsed + amount >
          account.dailyLimit
      ) {
        throw new Error(
          "DAILY_CREDIT_LIMIT_REACHED",
        );
      }

      if (
        !account.unlimited &&
        account.balance < amount
      ) {
        throw new Error(
          "HEXJIT_INSUFFICIENT_CREDITS",
        );
      }

      await tx.creditOperation.create({
        data: {
          operationId:
            input.operationId,
          userId:
            input.userId,
          capability:
            input.capability,
          amount,
          status:
            "RESERVED",
        },
      });

      if (amount === 0) {
        return;
      }

      await tx.creditAccount.update({
        where: {
          id: account.id,
        },
        data: {
          balance: account.unlimited
            ? account.balance
            : {
                decrement:
                  amount,
              },

          dailyUsed:
            account.unlimited
              ? dailyUsed
              : {
                  increment:
                    amount,
                },

          dailyResetAt:
            account.dailyResetAt <=
            new Date()
              ? nextUtcDay()
              : undefined,
        },
      });
    },
  );
}

export async function commitCredits(
  input: CreditOperation,
): Promise<void> {
  const amount =
    validateAmount(input.amount);

  await prisma.$transaction(
    async (tx) => {
      const operation =
        await tx.creditOperation.findUnique({
          where: {
            operationId:
              input.operationId,
          },
        });

      if (!operation) {
        throw new Error(
          "CREDIT_OPERATION_NOT_FOUND",
        );
      }

      if (
        operation.status ===
        "COMMITTED"
      ) {
        return;
      }

      if (
        operation.status ===
        "RELEASED"
      ) {
        throw new Error(
          "CREDIT_OPERATION_ALREADY_RELEASED",
        );
      }

      /*
       * RESERVED -> COMMITTED exactly once.
       */
      await tx.creditOperation.update({
        where: {
          id:
            operation.id,
        },
        data: {
          status:
            "COMMITTED",
        },
      });

      if (amount === 0) {
        return;
      }

      if (
        operation.amount !== amount
      ) {
        throw new Error(
          "CREDIT_OPERATION_AMOUNT_MISMATCH",
        );
      }

      await tx.creditAccount.update({
        where: {
          userId:
            input.userId,
        },
        data: {
          lifetimeUsed: {
            increment:
              amount,
          },
        },
      });
    },
  );
}

export async function releaseCredits(
  input: CreditOperation,
): Promise<void> {
  const amount =
    validateAmount(input.amount);

  await prisma.$transaction(
    async (tx) => {
      const operation =
        await tx.creditOperation.findUnique({
          where: {
            operationId:
              input.operationId,
          },
        });

      if (!operation) {
        throw new Error(
          "CREDIT_OPERATION_NOT_FOUND",
        );
      }

      if (
        operation.status ===
        "RELEASED"
      ) {
        return;
      }

      if (
        operation.status ===
        "COMMITTED"
      ) {
        throw new Error(
          "CREDIT_OPERATION_ALREADY_COMMITTED",
        );
      }

      if (
        operation.amount !== amount
      ) {
        throw new Error(
          "CREDIT_OPERATION_AMOUNT_MISMATCH",
        );
      }

      await tx.creditOperation.update({
        where: {
          id:
            operation.id,
        },
        data: {
          status:
            "RELEASED",
        },
      });

      if (amount === 0) {
        return;
      }

      await tx.creditAccount.update({
        where: {
          userId:
            input.userId,
        },
        data: {
          balance: {
            increment:
              amount,
          },

          dailyUsed: {
            decrement:
              amount,
          },
        },
      });
    },
  );
}

/*
 * Default V1 credit pricing.
 *
 * Super Admin configuration can replace this resolver
 * without changing AI Gateway contracts.
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
  const configured =
    await prisma.creditCost.findUnique({
      where: {
        capability,
      },
    });

  if (
    configured?.isEnabled === false
  ) {
    throw new Error(
      "CREDIT_CAPABILITY_DISABLED",
    );
  }

  return (
    configured?.cost ??
    DEFAULT_COSTS[capability] ??
    1
  );
}
