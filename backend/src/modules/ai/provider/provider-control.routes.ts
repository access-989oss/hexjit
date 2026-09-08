import type { FastifyInstance } from "fastify";
import {
  AI_PROVIDER_PRESETS,
  getProviderPreset,
} from "./provider.presets.js";
import {
  providerPresetSlugSchema,
  providerTestSchema,
} from "./provider.preset.schemas.js";
import { testProviderConnection } from "./provider-test.service.js";

export async function registerProviderControlRoutes(
  app: FastifyInstance,
) {
  app.get("/admin/ai/providers/presets", async () => ({
    success: true,
    data: AI_PROVIDER_PRESETS,
  }));

  app.get(
    "/admin/ai/providers/presets/:slug",
    async (request, reply) => {
      const parsed = providerPresetSlugSchema.safeParse(
        request.params,
      );

      if (!parsed.success) {
        return reply.code(400).send({
          success: false,
          error: {
            code: "INVALID_PROVIDER_PRESET",
            message: "Invalid provider preset.",
          },
        });
      }

      const preset = getProviderPreset(parsed.data.slug);

      if (!preset) {
        return reply.code(404).send({
          success: false,
          error: {
            code: "PROVIDER_PRESET_NOT_FOUND",
            message: "Provider preset not found.",
          },
        });
      }

      return {
        success: true,
        data: preset,
      };
    },
  );

  app.post(
    "/admin/ai/providers/test",
    async (request, reply) => {
      const parsed = providerTestSchema.safeParse(
        request.body,
      );

      if (!parsed.success) {
        return reply.code(400).send({
          success: false,
          error: {
            code: "INVALID_PROVIDER_TEST_REQUEST",
            message: "providerId is required.",
          },
        });
      }

      const result = await testProviderConnection(
        parsed.data.providerId,
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
