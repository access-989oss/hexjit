import type { FastifyInstance } from "fastify";
import {
  createProviderSchema,
  updateProviderSchema,
} from "./provider.schemas.js";
import {
  listProviders,
  getProviderById,
  createProvider,
  updateProvider,
  deleteProvider,
} from "./provider.service.js";
import { requireAdmin } from "../../../middleware/admin-auth.js";

export async function providerRoutes(
  app: FastifyInstance,
) {
  app.get(
    "/admin/ai/providers",
    {
      preHandler: requireAdmin,
    },
    async () => {
      return {
        success: true,
        data: await listProviders(),
      };
    },
  );

  app.get(
    "/admin/ai/providers/:id",
    {
      preHandler: requireAdmin,
    },
    async (request, reply) => {
      const { id } =
        request.params as { id: string };

      const provider =
        await getProviderById(id);

      if (!provider) {
        return reply.code(404).send({
          success: false,
          error: "AI_PROVIDER_NOT_FOUND",
        });
      }

      return {
        success: true,
        data: provider,
      };
    },
  );

  app.post(
    "/admin/ai/providers",
    {
      preHandler: requireAdmin,
    },
    async (request, reply) => {
      const parsed =
        createProviderSchema.safeParse(
          request.body,
        );

      if (!parsed.success) {
        return reply.code(400).send({
          success: false,
          error: "INVALID_AI_PROVIDER",
          details: parsed.error.flatten(),
        });
      }

      try {
        const provider =
          await createProvider(
            parsed.data,
          );

        return reply.code(201).send({
          success: true,
          data: provider,
        });
      } catch (error) {
        request.log.error(error);

        return reply.code(409).send({
          success: false,
          error: "AI_PROVIDER_CREATE_FAILED",
        });
      }
    },
  );

  app.patch(
    "/admin/ai/providers/:id",
    {
      preHandler: requireAdmin,
    },
    async (request, reply) => {
      const parsed =
        updateProviderSchema.safeParse(
          request.body,
        );

      if (!parsed.success) {
        return reply.code(400).send({
          success: false,
          error: "INVALID_AI_PROVIDER",
          details: parsed.error.flatten(),
        });
      }

      try {
        const provider =
          await updateProvider(
            (request.params as { id: string })
              .id,
            parsed.data,
          );

        if (!provider) {
          return reply.code(404).send({
            success: false,
            error: "AI_PROVIDER_NOT_FOUND",
          });
        }

        return {
          success: true,
          data: provider,
        };
      } catch (error) {
        request.log.error(error);

        return reply.code(409).send({
          success: false,
          error: "AI_PROVIDER_UPDATE_FAILED",
        });
      }
    },
  );

  app.delete(
    "/admin/ai/providers/:id",
    {
      preHandler: requireAdmin,
    },
    async (request, reply) => {
      const deleted =
        await deleteProvider(
          (request.params as { id: string })
            .id,
        );

      if (!deleted) {
        return reply.code(404).send({
          success: false,
          error: "AI_PROVIDER_NOT_FOUND",
        });
      }

      return {
        success: true,
        message: "AI provider deleted.",
      };
    },
  );
}
