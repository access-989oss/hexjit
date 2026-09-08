import { z } from "zod";

export const configureWhatsAppSchema =
  z.object({
    userId: z.string().min(1),
    phoneNumber: z.string().min(5).max(30).optional(),
    businessId: z.string().min(1).optional(),
    phoneNumberId: z.string().min(1),
    accessToken: z.string().min(1),
  });

export const whatsappAccountIdSchema =
  z.object({
    id: z.string().min(1),
  });
