import type { FastifyInstance } from "fastify";
import { userRoutes } from "../modules/users/user.routes.js";
import { authRoutes } from "../modules/auth/auth.routes.js";
import { meRoutes } from "../modules/auth/me.routes.js";
import { adminAuthRoutes } from "../modules/admin-auth/admin-auth.routes.js";
import { adminMeRoutes } from "../modules/admin-auth/admin-me.routes.js";
import { aiRoutes } from "../modules/ai/index.js";
import { registerWhatsAppAdminRoutes } from "../modules/whatsapp/admin/index.js";
import { registerWhatsAppConnectionRoutes } from "../modules/whatsapp/connector/whatsapp-connection.routes.js";
import { registerCreditRoutes } from "../modules/credits/index.js";

export async function apiRoutes(
  app: FastifyInstance,
) {
  await app.register(userRoutes);
  await app.register(authRoutes);
  await app.register(meRoutes);
  await app.register(adminAuthRoutes);
  await app.register(adminMeRoutes);
  await app.register(aiRoutes);
  await app.register(registerWhatsAppAdminRoutes);
  await app.register(registerWhatsAppConnectionRoutes);
  await app.register(registerCreditRoutes);
}
