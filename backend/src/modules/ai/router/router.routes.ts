import type { FastifyInstance } from "fastify";
import { requireAdmin } from "../../../middleware/admin-auth.js";
import { resolveTextRoute } from "./ai-router.service.js";

export async function aiRouterRoutes(
  app: FastifyInstance,
) {
  app.get(
    "/admin/ai/router/status",
    {
      preHandler: requireAdmin,
    },
    async () => {
      const textRoute =
        await resolveTextRoute();

      return {
        success: true,
        data: {
          text: textRoute
            ? {
                configured: true,
                providerId:
                  textRoute.provider.id,
                modelId:
                  textRoute.model.id,
                model:
                  textRoute.model.model,
                fallback:
                  textRoute.route.fallback,
              }
            : {
                configured: false,
              },
        },
      };
    },
  );
}
