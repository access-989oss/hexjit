import { registerProviderControlRoutes } from "./provider/provider-control.routes.js";
import type { FastifyInstance } from "fastify";
import { providerRoutes } from "./provider/provider.routes.js";
import { modelRoutes } from "./model/model.routes.js";
import { aiRouteRoutes } from "./route/route.routes.js";
import { aiRouterRoutes } from "./router/router.routes.js";

export async function aiRoutes(
  app: FastifyInstance,
) {
  await app.register(providerRoutes);
  await app.register(modelRoutes);
  await app.register(aiRouteRoutes);
  await app.register(aiRouterRoutes);
}


export { registerProviderControlRoutes } from "./provider/provider-control.routes.js";

export { executeAiOperation } from "./execution/index.js";
export type { AiExecutionCapability, AiExecutionRequest, AiExecutionResult, AiCreditContext, AiRouterContext } from "./execution/index.js";
export { createAiRouterAdapter } from "./integration/index.js";
export { createCreditAdapter } from "./integration/index.js";
export { createAiGateway } from "./integration/index.js";
export { configureAiDependencies } from "./integration/index.js";
export { getAiDependencies } from "./integration/index.js";
export { hasAiDependencies } from "./integration/index.js";
export { clearAiDependencies } from "./integration/index.js";
export { getAiGateway } from "./integration/index.js";

export { initializeProductionAiGateway, getProductionAiGateway, isProductionAiGatewayInitialized } from "./integration/index.js";
