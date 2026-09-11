import { prisma } from "../../../lib/prisma.js";
import type { WhatsAppConnector } from "./whatsapp-connector.types.js";

let initialized = false;

export async function restoreWhatsAppSessions(
  connector: WhatsAppConnector,
): Promise<void> {
  if (initialized) {
    return;
  }

  initialized = true;

  const accounts =
    await prisma.whatsAppAccount.findMany({
      where: {
        connectorType: "BAILEYS",
        status: {
          in: ["CONNECTED", "CONNECTING"],
        },
      },
      select: {
        id: true,
        userId: true,
      },
    });

  if (accounts.length === 0) {
    return;
  }

  for (const account of accounts) {
    try {
      await connector.restoreSession(
        account.id,
        account.userId,
      );
    } catch (error) {
      console.error(
        "[whatsapp] failed to restore session",
        {
          accountId: account.id,
          error:
            error instanceof Error
              ? error.message
              : "unknown error",
        },
      );
    }
  }
}
