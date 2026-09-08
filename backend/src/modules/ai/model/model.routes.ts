import type { FastifyInstance } from "fastify";
import {
  createModelSchema,
  updateModelSchema,
} from "./model.schemas.js";
import {
  listModels,
  createModel,
  updateModel,
  deleteModel,
} from "./model.service.js";
import { requireAdmin } from "../../../middleware/admin-auth.js";

export async function modelRoutes(
  app: FastifyInstance,
) {
  app.get(
    "/admin/ai/models",
    {
      preHandler: requireAdmin,
    },
    async (request) => {
      const providerId =
        (request.query as {
          providerId?: string;
        }).providerId;

      return {
        success: true,
        data: await listModels(
          providerId,
        ),
      };
    },
  );

  app.post(
    "/admin/ai/models",
    {
      preHandler: requireAdmin,
    },
    async (request, reply) => {
      const parsed =
        createModelSchema.safeParse(
          request.body,
        );

      if (!parsed.success) {
        return reply.code(400).send({
          success: false,
          error: "INVALID_AI_MODEL",
          details: parsed.error.flatten(),
        });
      }

      try {
        const model =
          await createModel(
            parsed.data,
          );

        return reply.code(201).send({
          success: true,
          data: model,
        });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "AI_MODEL_CREATE_FAILED";

        return reply.code(
          message ===
            "AI_PROVIDER_NOT_FOUND"
            ? 404
            : 409,
        ).send({
          success: false,
          error: message,
        });
      }
    },
  );

  app.patch(
    "/admin/ai/models/:id",
    {
      preHandler: requireAdmin,
    },
    async (request, reply) => {
      const parsed =
        updateModelSchema.safeParse(
          request.body,
        );

      if (!parsed.success) {
        return reply.code(400).send({
          success: false,
          error: "INVALID_AI_MODEL",
          details: parsed.error.flatten(),
        });
      }

      const model =
        await updateModel(
          (request.params as { id: string })
            .id,
          parsed.data,
        );

      if (!model) {
        return reply.code(404).send({
          success: false,
          error: "AI_MODEL_NOT_FOUND",
        });
      }

      return {
        success: true,
        data: model,
      };
    },
  );

  app.delete(
    "/admin/ai/models/:id",
    {
      preHandler: requireAdmin,
    },
    async (request, reply) => {
      const deleted =
        await deleteModel(
          (request.params as { id: string })
            .id,
        );

      if (!deleted) {
        return reply.code(404).send({
          success: false,
          error: "AI_MODEL_NOT_FOUND",
        });
      }

      return {
        success: true,
        message: "AI model deleted.",
      };
    },
  );
}
