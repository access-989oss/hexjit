import { z } from "zod";

export const providerPresetSlugSchema = z.object({
  slug: z.string().min(1).max(100),
});

export const providerTestSchema = z.object({
  providerId: z.string().min(1),
});
