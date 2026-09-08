import { prisma } from "../../lib/prisma.js";
import { CreditEntryType } from "../../generated/prisma/client.js";
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
  const value = startOfTodayUtc();
  value.setUTCDate(value.getUTCDate() + 1);
  return value;
}

export async function ensureCreditAccount(userId: string) {
  const existing = await prisma.creditAccount.findUnique({
    where: { userId },
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
    },
  });
}

export async function getCreditAccount(userId: string) {
  const account = await ensureCreditAccount(userId);

  if (account.dailyResetAt <= new Date()) {
    return prisma.creditAccount.update({
      where: { id: account.id },
      data: {
        dailyUsed: 0,
        dailyResetAt: nextUtcDay(),
      },
    });
  }

  return account;
}

export async function getCreditCost(capability: string) {
  const configured = await prisma.creditCost.findUnique({
    where: { capability },
  });

  return configured ?? {
    capability,
    cost: 1,
    isEnabled: true,
  };
}

export async function consumeCredits(input: {
  userId: string;
  capability: string;
  referenceId?: string;
  idempotencyKey: string;
  description?: string;
}) {
  const costConfig = await getCreditCost(input.capability);

  if (!costConfig.isEnabled) {
    throw new Error("CREDIT_CAPABILITY_DISABLED");
  }

  const cost = costConfig.cost;

  if (!Number.isInteger(cost) || cost < 0) {
    throw new Error("INVALID_CREDIT_COST");
  }

  return prisma.$transaction(async (tx) => {
    const duplicate = await tx.creditLedger.findUnique({
      where: {
        idempotencyKey: input.idempotencyKey,
      },
    });

    if (duplicate) {
      return {
        success: true,
        alreadyProcessed: true,
        balance: duplicate.balanceAfter,
        charged: duplicate.amount < 0
          ? Math.abs(duplicate.amount)
          : 0,
      };
    }

    const account = await tx.creditAccount.findUnique({
      where: {
        userId: input.userId,
      },
    });

    if (!account) {
      throw new Error("CREDIT_ACCOUNT_NOT_FOUND");
    }

    if (account.isSuspended) {
      throw new Error("CREDIT_ACCOUNT_SUSPENDED");
    }

    let dailyUsed = account.dailyUsed;

    if (account.dailyResetAt <= new Date()) {
      dailyUsed = 0;

      await tx.creditAccount.update({
        where: {
          id: account.id,
        },
        data: {
          dailyUsed: 0,
          dailyResetAt: nextUtcDay(),
        },
      });
    }

    if (!account.unlimited) {
      if (dailyUsed + cost > account.dailyLimit) {
        throw new Error("DAILY_CREDIT_LIMIT_REACHED");
      }

      if (account.balance < cost) {
        throw new Error("INSUFFICIENT_CREDITS");
      }
    }

    const newBalance = account.unlimited
      ? account.balance
      : account.balance - cost;

    const newDailyUsed = account.unlimited
      ? dailyUsed
      : dailyUsed + cost;

    const updated = await tx.creditAccount.update({
      where: {
        id: account.id,
      },
      data: {
        balance: newBalance,
        dailyUsed: newDailyUsed,
        lifetimeUsed: account.unlimited
          ? account.lifetimeUsed
          : {
              increment: BigInt(cost),
            },
      },
    });

    await tx.creditLedger.create({
      data: {
        userId: input.userId,
        amount: account.unlimited ? 0 : -cost,
        type: CreditEntryType.USAGE,
        capability: input.capability,
        idempotencyKey: input.idempotencyKey,
        metadata: input.referenceId
          ? {
              referenceId: input.referenceId,
            }
          : {},
        balanceAfter: updated.balance,
        referenceId: input.referenceId,
        description:
          input.description ??
          `AI ${input.capability} usage`,
      },
    });

    return {
      success: true,
      alreadyProcessed: false,
      balance: updated.balance,
      charged: account.unlimited ? 0 : cost,
    };
  });
}

export async function addCredits(input: {
  userId: string;
  amount: number;
  description?: string;
  idempotencyKey: string;
}) {
  if (
    !Number.isInteger(input.amount) ||
    input.amount <= 0
  ) {
    throw new Error("INVALID_CREDIT_AMOUNT");
  }

  return prisma.$transaction(async (tx) => {
    const duplicate = await tx.creditLedger.findUnique({
      where: {
        idempotencyKey: input.idempotencyKey,
      },
    });

    if (duplicate) {
      return {
        balance: duplicate.balanceAfter,
        alreadyProcessed: true,
      };
    }

    const account = await tx.creditAccount.findUnique({
      where: {
        userId: input.userId,
      },
    });

    if (!account) {
      throw new Error("CREDIT_ACCOUNT_NOT_FOUND");
    }

    const updated = await tx.creditAccount.update({
      where: {
        id: account.id,
      },
      data: {
        balance: {
          increment: input.amount,
        },
      },
    });

    await tx.creditLedger.create({
      data: {
        userId: input.userId,
        amount: input.amount,
        type: CreditEntryType.BONUS,
        capability: null,
        idempotencyKey: input.idempotencyKey,
        metadata: {},
        balanceAfter: updated.balance,
        description:
          input.description ?? "Bonus credits",
      },
    });

    return {
      balance: updated.balance,
      alreadyProcessed: false,
    };
  });
}
