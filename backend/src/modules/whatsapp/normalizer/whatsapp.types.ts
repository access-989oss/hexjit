export type WhatsAppNormalizedMessageType =
  | "text"
  | "image"
  | "audio"
  | "video"
  | "document"
  | "sticker"
  | "location"
  | "reaction"
  | "unknown";

export type WhatsAppNormalizedMessage = {
  externalMessageId: string;
  accountId: string;
  fromNumber?: string;
  toNumber?: string;
  type: WhatsAppNormalizedMessageType;
  text?: string;
  mediaId?: string;
  mimeType?: string;
  fileName?: string;
  latitude?: number;
  longitude?: number;
  caption?: string;
  timestamp?: string;
  raw: unknown;
};
