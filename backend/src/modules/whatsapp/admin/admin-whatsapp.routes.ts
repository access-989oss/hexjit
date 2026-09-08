import type {
  FastifyInstance,
} from "fastify";

import {
  configureWhatsAppSchema,
  whatsappAccountIdSchema,
} from "./admin-whatsapp.schemas.js";

import {
  listAdminWhatsAppAccounts,
  configureWhatsAppAccount,
  testConfiguredWhatsApp,
} from "./admin-whatsapp.service.js";

export async function registerWhatsAppAdminRoutes(
  app: FastifyInstance,
) {
  app.get(
    "/admin/whatsapp/accounts",
    async () => {
      return {
        success: true,
        data:
          await listAdminWhatsAppAccounts(),
      };
    },
  );

  app.post(
    "/admin/whatsapp/accounts",
    async (request, reply) => {
      const parsed =
        configureWhatsAppSchema.safeParse(
          request.body,
        );

      if (!parsed.success) {
        return reply.code(400).send({
          success: false,
          error: {
            code:
              "INVALID_WHATSAPP_CONFIGURATION",
            message:
              "Invalid WhatsApp configuration.",
          },
        });
      }

      const account =
        await configureWhatsAppAccount(
          parsed.data,
        );

      return {
        success: true,
        data: account,
      };
    },
  );

  app.post(
    "/admin/whatsapp/accounts/:id/test",
    async (request, reply) => {
      const parsed =
        whatsappAccountIdSchema.safeParse(
          request.params,
        );

      if (!parsed.success) {
        return reply.code(400).send({
          success: false,
          error: {
            code:
              "INVALID_WHATSAPP_ACCOUNT_ID",
            message:
              "Invalid WhatsApp account ID.",
          },
        });
      }

      const result =
        await testConfiguredWhatsApp(
          parsed.data.id,
        );

      return reply
        .code(result.success ? 200 : 502)
        .send({
          success: result.success,
          data: result,
        });
    },
  );
}
