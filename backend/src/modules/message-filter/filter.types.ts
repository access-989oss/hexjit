export const MESSAGE_CLASSIFICATIONS = {
  NORMAL: "NORMAL",
  PERSONAL: "PERSONAL",
  BUSINESS: "BUSINESS",
  PROMOTIONAL: "PROMOTIONAL",
  SPAM: "SPAM",
  SUSPICIOUS: "SUSPICIOUS",
} as const;

export type MessageClassification =
  (typeof MESSAGE_CLASSIFICATIONS)[keyof typeof MESSAGE_CLASSIFICATIONS];

export const FILTER_ACTIONS = {
  ALLOW: "ALLOW",
  IGNORE: "IGNORE",
  FLAG: "FLAG",
} as const;

export type FilterAction =
  (typeof FILTER_ACTIONS)[keyof typeof FILTER_ACTIONS];

export type MessageFilterResult = {
  classification: MessageClassification;
  action: FilterAction;
  score: number;
  reasons: string[];
};
