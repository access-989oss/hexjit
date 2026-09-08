import {
  executeAutomationActions,
} from "../automation/action.service.js";

import type {
  AutomationExecutionContext,
} from "../automation/action.service.js";

import {
  sendWhatsAppTextMessage,
} from "../whatsapp/message/outbound.service.js";

export type AutomationContinuationInput = {
  automationId: string;
  userId: string;
  accountId: string;
  conversationId?: string;
  recipientPhone?: string;
  actions: Array<{
    type: string;
    config: Record<string, unknown>;
  }>;
  startAtIndex: number;
  metadata?: Record<string, unknown>;
};

function requireRecipient(
  input: AutomationContinuationInput,
): string {
  const phone =
    input.recipientPhone ??
    (
      input.metadata?.recipientPhone as
        | string
        | undefined
    );

  if (
    typeof phone !== "string" ||
    !phone.trim()
  ) {
    throw new Error(
      "AUTOMATION_RECIPIENT_PHONE_REQUIRED",
    );
  }

  return phone;
}

export async function executeAutomationContinuation(
  input: AutomationContinuationInput,
) {
  if (
    !Number.isInteger(input.startAtIndex) ||
    input.startAtIndex < 0
  ) {
    throw new Error(
      "AUTOMATION_INVALID_START_INDEX",
    );
  }

  const remainingActions =
    input.actions.slice(
      input.startAtIndex,
    );

  if (remainingActions.length === 0) {
    return {
      executedActions: [],
      stopped: false,
      ignored: false,
      completed: true,
    };
  }

  const recipientPhone =
    requireRecipient(input);

  const executionContext: AutomationExecutionContext =
    {
      sendText: async (
        text: string,
      ) => {
        if (!text.trim()) {
          throw new Error(
            "AUTOMATION_SEND_TEXT_EMPTY",
          );
        }

        return sendWhatsAppTextMessage({
          accountId:
            input.accountId,
          recipientPhone,
          text,
        });
      },

      /*
       * AI actions remain capability boundaries.
       * They will be connected to the centralized
       * AI Router / Credit Engine in their dedicated
       * integration step.
       */
    };

  return executeAutomationActions(
    remainingActions as never,
    executionContext,
  );
}
