export type CreditCapability =
  | "text"
  | "vision"
  | "image"
  | "speech_to_text"
  | "text_to_speech"
  | "video";

export type CreditCostResolver = (
  capability: CreditCapability,
) => Promise<number>;

export type CreditOperation = {
  userId: string;
  amount: number;
  operationId: string;
  capability: CreditCapability;
};

export type CreditSnapshot = {
  balance: number;
  lifetimeUsed: number;
};
