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
