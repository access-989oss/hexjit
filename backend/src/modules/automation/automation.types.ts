export const AUTOMATION_TRIGGERS = {
  NEW_MESSAGE: "NEW_MESSAGE",
  KEYWORD: "KEYWORD",
  CONTACT: "CONTACT",
  GROUP: "GROUP",
  IMAGE: "IMAGE",
  VOICE: "VOICE",
  FILE: "FILE",
  SCHEDULE: "SCHEDULE",
} as const;

export type AutomationTrigger =
  (typeof AUTOMATION_TRIGGERS)[keyof typeof AUTOMATION_TRIGGERS];

export const AUTOMATION_ACTIONS = {
  AI_REPLY: "AI_REPLY",
  SEND_TEXT: "SEND_TEXT",
  SEND_IMAGE: "SEND_IMAGE",
  ANALYZE_IMAGE: "ANALYZE_IMAGE",
  WAIT: "WAIT",
  FOLLOW_UP: "FOLLOW_UP",
  IGNORE: "IGNORE",
  STOP: "STOP",
} as const;

export type AutomationAction =
  (typeof AUTOMATION_ACTIONS)[keyof typeof AUTOMATION_ACTIONS];

export type AutomationCondition = {
  type:
    | "CONTACT"
    | "GROUP"
    | "KEYWORD"
    | "WORKING_HOURS"
    | "AI_INTENT"
    | "PREVIOUS_MESSAGE"
    | "ENABLED";

  value?: unknown;
};

export type AutomationActionConfig = {
  type: AutomationAction;
  config?: Record<string, unknown>;
};

export type AutomationDefinition = {
  id: string;
  name: string;
  enabled: boolean;
  priority: number;
  trigger: AutomationTrigger;
  triggerConfig?: Record<string, unknown>;
  conditions?: AutomationCondition[];
  actions: AutomationActionConfig[];
};
