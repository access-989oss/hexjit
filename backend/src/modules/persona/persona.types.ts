export type PersonaProfile = {
  language?: string;
  secondaryLanguage?: string;
  vocabulary?: "simple" | "normal" | "advanced";
  tone?: "casual" | "friendly" | "professional" | "formal" | "neutral";
  humor?: "none" | "light" | "frequent";
  emojiLevel?: "none" | "low" | "medium" | "high";
  sentenceLength?: "short" | "medium" | "long";
  greetings?: string[];
  closings?: string[];
  communicationRules?: string[];
  behaviorWithFriends?: string;
  behaviorWithCustomers?: string;
  behaviorWithStrangers?: string;

  /** AI's display name when introducing itself (default: "Hexjit"). */
  aiName?: string;

  /** How the AI describes its relation to the account owner,
   *  e.g. "Rahul bhai ka personal assistant" or "Rahul boss ka dost". */
  identityDescription?: string;

  /** Reply delay in seconds. null/undefined = reply immediately. */
  replyDelaySeconds?: number;

  /** Language behavior:
   *  - "AUTO": mirror the contact's language (default)
   *  - "FIXED": always reply in `language`
   */
  languageMode?: "AUTO" | "FIXED";
};

export type ContactPersonaOverride = {
  contactId: string;
  tone?: PersonaProfile["tone"];
  language?: string;
  emojiLevel?: PersonaProfile["emojiLevel"];
  sentenceLength?: PersonaProfile["sentenceLength"];
  communicationRules?: string[];
};

export type MemoryItem = {
  id: string;
  fact: string;
  importance: "low" | "medium" | "high";
  source?: string;
  createdAt?: string;
};

export type PersonaContext = {
  persona: PersonaProfile;
  contactOverride?: ContactPersonaOverride;
  memories: MemoryItem[];
};
