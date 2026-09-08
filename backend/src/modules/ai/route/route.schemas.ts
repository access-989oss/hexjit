import { z } from "zod";
import { capabilitySchema } from "../model/model.schemas.js";

export const updateRouteSchema = z.object({
  capability: capabilitySchema,
  providerId: z.string().min(1).nullable().optional(),
  modelId: z.string().min(1).nullable().optional(),
  priority: z.number().int().min(0).max(100000),
  isEnabled: z.boolean(),
  fallback: z.boolean(),
});
