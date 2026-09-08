import type {
  WhatsAppNormalizedMessage,
  WhatsAppNormalizedMessageType,
} from "./whatsapp.types.js";

type UnknownRecord = Record<string, unknown>;

function isRecord(
  value: unknown,
): value is UnknownRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function getString(
  value: unknown,
): string | undefined {
  return typeof value === "string"
    ? value
    : undefined;
}

function getNumber(
  value: unknown,
): number | undefined {
  return typeof value === "number"
    ? value
    : undefined;
}

function detectType(
  message: UnknownRecord,
): WhatsAppNormalizedMessageType {
  if (isRecord(message.text)) {
    return "text";
  }

  if (isRecord(message.image)) {
    return "image";
  }

  if (isRecord(message.audio)) {
    return "audio";
  }

  if (isRecord(message.video)) {
    return "video";
  }

  if (isRecord(message.document)) {
    return "document";
  }

  if (isRecord(message.sticker)) {
    return "sticker";
  }

  if (isRecord(message.location)) {
    return "location";
  }

  if (isRecord(message.reaction)) {
    return "reaction";
  }

  return "unknown";
}

export function normalizeMetaWebhookMessages(
  accountId: string,
  payload: unknown,
): WhatsAppNormalizedMessage[] {
  const result: WhatsAppNormalizedMessage[] = [];

  if (!isRecord(payload)) {
    return result;
  }

  const entries = Array.isArray(payload.entry)
    ? payload.entry
    : [];

  for (const entryValue of entries) {
    if (!isRecord(entryValue)) {
      continue;
    }

    const changes = Array.isArray(
      entryValue.changes,
    )
      ? entryValue.changes
      : [];

    for (const changeValue of changes) {
      if (!isRecord(changeValue)) {
        continue;
      }

      const value = isRecord(changeValue.value)
        ? changeValue.value
        : null;

      if (!value) {
        continue;
      }

      const messages = Array.isArray(
        value.messages,
      )
        ? value.messages
        : [];

      for (const messageValue of messages) {
        if (!isRecord(messageValue)) {
          continue;
        }

        const id = getString(
          messageValue.id,
        );

        if (!id) {
          continue;
        }

        const fromNumber = getString(
          messageValue.from,
        );

        const timestamp = getString(
          messageValue.timestamp,
        );

        const type = detectType(
          messageValue,
        );

        const normalized: WhatsAppNormalizedMessage =
          {
            externalMessageId: id,
            accountId,
            fromNumber,
            type,
            timestamp,
            raw: messageValue,
          };

        const text =
          isRecord(messageValue.text)
            ? getString(
                messageValue.text.body,
              )
            : undefined;

        if (text) {
          normalized.text = text;
        }

        const image =
          isRecord(messageValue.image)
            ? messageValue.image
            : undefined;

        if (image) {
          normalized.mediaId =
            getString(image.id);
          normalized.mimeType =
            getString(image.mime_type);
          normalized.caption =
            getString(image.caption);
        }

        const audio =
          isRecord(messageValue.audio)
            ? messageValue.audio
            : undefined;

        if (audio) {
          normalized.mediaId =
            getString(audio.id);
          normalized.mimeType =
            getString(audio.mime_type);
        }

        const video =
          isRecord(messageValue.video)
            ? messageValue.video
            : undefined;

        if (video) {
          normalized.mediaId =
            getString(video.id);
          normalized.mimeType =
            getString(video.mime_type);
          normalized.caption =
            getString(video.caption);
        }

        const document =
          isRecord(messageValue.document)
            ? messageValue.document
            : undefined;

        if (document) {
          normalized.mediaId =
            getString(document.id);
          normalized.mimeType =
            getString(document.mime_type);
          normalized.fileName =
            getString(document.filename);
          normalized.caption =
            getString(document.caption);
        }

        const sticker =
          isRecord(messageValue.sticker)
            ? messageValue.sticker
            : undefined;

        if (sticker) {
          normalized.mediaId =
            getString(sticker.id);
          normalized.mimeType =
            getString(sticker.mime_type);
        }

        const location =
          isRecord(messageValue.location)
            ? messageValue.location
            : undefined;

        if (location) {
          normalized.latitude =
            getNumber(location.latitude);
          normalized.longitude =
            getNumber(location.longitude);
        }

        result.push(normalized);
      }
    }
  }

  return result;
}
