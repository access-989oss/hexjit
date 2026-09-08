import {
  sendWhatsAppTextMessage,
} from "../whatsapp/message/outbound.service.js";

import {
  saveOutboundMessage,
} from "../whatsapp/message/outbound-record.service.js";

export async function executeFollowUpJob(input: {
  accountId: string;
  recipientPhone: string;
  message: string;
}) {
  if (!input.message.trim()) {
    throw new Error(
      "FOLLOW_UP_MESSAGE_EMPTY",
    );
  }

  const response =
    await sendWhatsAppTextMessage({
      accountId:
        input.accountId,
      recipientPhone:
        input.recipientPhone,
      text:
        input.message,
    });

  const body =
    response as {
      messages?: Array<{
        id?: string;
      }>;
    };

  const externalId =
    body.messages?.[0]?.id;

  if (externalId) {
    await saveOutboundMessage({
      accountId:
        input.accountId,
      externalMessageId:
        externalId,
      recipientPhone:
        input.recipientPhone,
      text:
        input.message,
      status:
        "SENT",
    });
  }

  return response;
}
