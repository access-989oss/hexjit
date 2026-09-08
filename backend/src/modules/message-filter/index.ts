export {
  MESSAGE_CLASSIFICATIONS,
  FILTER_ACTIONS,
} from "./filter.types.js";

export type {
  MessageClassification,
  FilterAction,
  MessageFilterResult,
} from "./filter.types.js";

export {
  classifyMessageByRules,
} from "./rule-detector.service.js";

export {
  applyFilterPolicy,
} from "./filter-policy.service.js";

export {
  filterIncomingMessage,
} from "./filter.service.js";
