import type { FastifyInstance } from "fastify";
import {
  updateRouteSchema,
} from "./route.schemas.js";
import {
  listRoutes,
  upsertRoute,
  deleteRoute,
} from "./route.service.js";
import { requireAdmin } from "../../../middleware/admin-auth.js";

export async function aiRouteRoutes(
  app: FastifyInstance,
) {
  app.get(
    "/admin/ai/routes",
    {
      preHandler: requireAdmin,
    },
    async () => ({
      success: true,
      data: await listRoutes(),
    }),
  );

  app.put(
    "/admin/ai/routes",
    {
      preHandler: requireAdmin,
    },
    async (request, reply) => {
      const parsed =
        updateRouteSchema.safeParse(
          request.body,
        );

      if (!parsed.success) {
        return reply.code(400).send({
          success: false,
          error: "INVALID_AI_ROUTE",
          details: parsed.error.flatten(),
        });
      }

      const route =
        await upsertRoute(
          parsed.data,
        );

      return {
        success: true,
        data: route,
      };
    },
  );

  app.delete(
    "/admin/ai/routes/:id",
    {
      preHandler: requireAdmin,
    },
    async (request, reply) => {
      const deleted =
        await deleteRoute(
          (request.params as { id: string })
            .id,
        );

      if (!deleted) {
        return reply.code(404).send({
          success: false,
          error: "AI_ROUTE_NOT_FOUND",
        });
      }

      return {
        success: true,
        message: "AI route deleted.",
      };
    },
  );
}
