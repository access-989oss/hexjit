export {
  createPersistentAutomation,
  getPersistentAutomation,
  listPersistentAutomations,
  setPersistentAutomationEnabled,
  deletePersistentAutomation,
} from "./automation.persistence.service.js";

export {
  startPersistentAutomationRun,
  completePersistentAutomationRun,
  failPersistentAutomationRun,
  listPersistentAutomationRuns,
} from "./run.persistence.service.js";
