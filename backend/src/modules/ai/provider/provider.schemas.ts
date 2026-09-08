import { z } from "zod";

export const providerProtocolSchema = z.enum([
  "openai_compatible",
  "custom",
]);

export const createProviderSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z
    .string()
    .min(2)
    .max(100)
    .regex(
      /^[a-z0-9-]+$/,
      "Slug must contain lowercase letters, numbers and hyphens only.",
    ),
  protocol: providerProtocolSchema.default(
    "openai_compatible",
  ),
  baseUrl: z.string().url(),
  apiKey: z.string().min(1),
  isEnabled: z.boolean().default(true),
  isDefault: z.boolean().default(false),
});

export const updateProviderSchema =
  createProviderSchema.partial();

export const providerIdSchema = z.object({
  id: z.string().min(1),
});
