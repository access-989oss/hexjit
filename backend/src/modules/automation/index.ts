export {
  AUTOMATION_TRIGGERS,
  AUTOMATION_ACTIONS,
} from "./automation.types.js";

export type {
  AutomationTrigger,
  AutomationAction,
  AutomationCondition,
  AutomationActionConfig,
  AutomationDefinition,
} from "./automation.types.js";

export {
  matchesTrigger,
} from "./trigger.service.js";

export {
  conditionsMatch,
} from "./condition.service.js";

export {
  selectAutomations,
} from "./selector.service.js";

export {
  executeAutomationActions,
} from "./action.service.js";

export type {
  AutomationExecutionContext,
  AutomationExecutionResult,
} from "./action.service.js";

export {
  runAutomations,
} from "./automation.service.js";

export {
  createPersistentAutomation,
  getPersistentAutomation,
  listPersistentAutomations,
  setPersistentAutomationEnabled,
  deletePersistentAutomation,
  startPersistentAutomationRun,
  completePersistentAutomationRun,
  failPersistentAutomationRun,
  listPersistentAutomationRuns,
} from "./persistence/index.js";

export {
  loadUserAutomations,
  executePersistentAutomations,
} from "./runtime/index.js";

export type {
  AutomationRuntimeEvent,
  AutomationRuntimeAction,
  AutomationRuntimeContext,
} from "./runtime/index.js";

export { executeAutomationAiReply } from "./runtime/ai-action.adapter.js";

export { runAutomationAiReply } from "./runtime/automation-ai-executor.service.js";

export { executeProductionAiReply } from "./runtime/production-ai-reply.service.js";
