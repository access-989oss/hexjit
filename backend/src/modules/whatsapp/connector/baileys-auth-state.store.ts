import {
  BufferJSON,
  initAuthCreds,
  makeCacheableSignalKeyStore,
  type AuthenticationCreds,
  type AuthenticationState,
  type SignalDataSet,
  type SignalDataTypeMap,
  type SignalKeyStore,
} from "@whiskeysockets/baileys";
import { prisma } from "../../../lib/prisma.js";
import {
  encryptWhatsAppSecret,
  decryptWhatsAppSecret,
} from "../crypto/whatsapp-crypto.js";

function serialize(value: unknown): string {
  return JSON.stringify(value, BufferJSON.replacer);
}

function deserialize<T>(value: string): T {
  return JSON.parse(value, BufferJSON.reviver) as T;
}

export class BaileysAuthStateStore {
  async getState(
    accountId: string,
  ): Promise<AuthenticationState> {
    const rows = await prisma.whatsAppAuthState.findMany({
      where: { accountId },
    });

    let creds: AuthenticationCreds = initAuthCreds();

    const keyData: Record<string, Record<string, unknown>> = {};

    for (const row of rows) {
      const value = deserialize<unknown>(
        decryptWhatsAppSecret(row.stateValueEnc),
      );

      if (row.stateKey === "creds") {
        creds = value as AuthenticationCreds;
        continue;
      }

      const separator = row.stateKey.indexOf(":");

      if (separator === -1) {
        continue;
      }

      const type = row.stateKey.slice(0, separator);
      const id = row.stateKey.slice(separator + 1);

      keyData[type] ??= {};
      keyData[type][id] = value;
    }

    const keys: SignalKeyStore = {
      get: async <T extends keyof SignalDataTypeMap>(
        type: T,
        ids: string[],
      ) => {
        const result: { [id: string]: SignalDataTypeMap[T] } = {};

        for (const id of ids) {
          const value = keyData[type]?.[id];

          if (value !== undefined) {
            result[id] = value as SignalDataTypeMap[T];
          }
        }

        return result;
      },

      set: async (data: SignalDataSet) => {
        for (const [type, entries] of Object.entries(data)) {
          for (const [id, value] of Object.entries(entries)) {
            const stateKey = `${type}:${id}`;

            if (value === null) {
              await prisma.whatsAppAuthState.deleteMany({
                where: {
                  accountId,
                  stateKey,
                },
              });
              continue;
            }

            const encrypted = encryptWhatsAppSecret(
              serialize(value),
            );

            await prisma.whatsAppAuthState.upsert({
              where: {
                accountId_stateKey: {
                  accountId,
                  stateKey,
                },
              },
              create: {
                accountId,
                stateKey,
                stateValueEnc: encrypted,
              },
              update: {
                stateValueEnc: encrypted,
              },
            });
          }
        }
      },

      clear: async () => {
        await prisma.whatsAppAuthState.deleteMany({
          where: { accountId },
        });
      },
    };

    return {
      creds,
      keys: makeCacheableSignalKeyStore(keys),
    };
  }

  async saveCreds(
    accountId: string,
    creds: AuthenticationCreds,
  ): Promise<void> {
    const encrypted = encryptWhatsAppSecret(
      serialize(creds),
    );

    await prisma.whatsAppAuthState.upsert({
      where: {
        accountId_stateKey: {
          accountId,
          stateKey: "creds",
        },
      },
      create: {
        accountId,
        stateKey: "creds",
        stateValueEnc: encrypted,
      },
      update: {
        stateValueEnc: encrypted,
      },
    });
  }

  async clear(accountId: string): Promise<void> {
    await prisma.whatsAppAuthState.deleteMany({
      where: { accountId },
    });
  }
}
