import type { FastifyInstance } from "fastify";
import { getCreditAccount } from "./credit.service.js";

type AuthenticatedRequest = {
  user?: {
    id: string;
  };
};

export async function registerCreditRoutes(
  app: FastifyInstance,
) {
  app.get(
    "/credits",
    async (request, reply) => {
      const userId =
        (request as AuthenticatedRequest).user?.id;

      if (!userId) {
        return reply.code(401).send({
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication required.",
          },
        });
      }

      const account =
        await getCreditAccount(userId);

      return {
        success: true,
        data: {
          balance: account.balance,
          dailyLimit: account.dailyLimit,
          dailyUsed: account.dailyUsed,
          unlimited: account.unlimited,
          suspended: account.isSuspended,
          lifetimeUsed:
            account.lifetimeUsed.toString(),
          dailyResetAt: account.dailyResetAt,
        },
      };
    },
  );
}
