import { z } from "zod";
import { Prisma } from "../../../generated/prisma/client.js";

export const capabilitySchema = z.enum([
  "text",
  "vision",
  "image",
  "speech_to_text",
  "text_to_speech",
  "video",
]);

const jsonObjectSchema =
  z.custom<Prisma.InputJsonValue>(
    (value) => {
      if (
        value === null ||
        value === undefined
      ) {
        return false;
      }

      try {
        JSON.stringify(value);
        return true;
      } catch {
        return false;
      }
    },
    {
      message:
        "Metadata must be valid JSON.",
    },
  );

export const createModelSchema =
  z.object({
    providerId: z.string().min(1),
    model: z.string().min(1).max(200),
    displayName: z
      .string()
      .max(200)
      .optional(),
    capability: capabilitySchema,
    isEnabled: z.boolean().default(true),
    isDefault: z.boolean().default(false),
    metadata: jsonObjectSchema.optional(),
  });

export const updateModelSchema =
  createModelSchema.partial();

export const modelIdSchema = z.object({
  id: z.string().min(1),
});
