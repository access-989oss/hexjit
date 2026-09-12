import {
  selectAutomations,
} from "../selector.service.js";

import {
  executeAutomationActions,
} from "../action.service.js";

import {
  startPersistentAutomationRun,
  completePersistentAutomationRun,
  failPersistentAutomationRun,
} from "../persistence/index.js";

import type {
  AutomationDefinition,
} from "../automation.types.js";

import type {
  AutomationRuntimeEvent,
  AutomationRuntimeContext,
} from "./runtime.types.js";

import {
  scheduleAutomationAction,
} from "../../scheduler/automation-action-scheduler.service.js";

import {
  loadPreviousMessage,
  classifyIntent,
} from "./condition-context.service.js";

async function buildConditionContext(
  event: AutomationRuntimeEvent,
) {
  const [previousMessage, aiIntent] =
    await Promise.all([
      loadPreviousMessage({
        conversationId: event.conversationId,
        currentExternalMessageId: event.messageId,
      }),
      Promise.resolve(
        classifyIntent(event.text),
      ),
    ]);

  return {
    contactId: event.contactId,
    groupId: event.groupId,
    text: event.text,
    enabled: true,
    hour: new Date().getHours(),
    previousMessage,
    aiIntent,
  };
}

export async function executePersistentAutomations(
  automations: AutomationDefinition[],
  event: AutomationRuntimeEvent,
  runtime: AutomationRuntimeContext,
) {
  const conditionContext =
    await buildConditionContext(
      event,
    );

  const selected =
    selectAutomations(
      automations,
      event,
      conditionContext,
    );

  const results = [];

  for (const automation of selected) {
    /*
     * Inbound WhatsApp events carry a stable provider message ID.
     * Bind the automation run to that ID + automation ID so retries
     * of the same webhook cannot execute the automation twice.
     */
    const idempotencyKey =
      event.messageId
        ? `wa:${event.messageId}:automation:${automation.id}`
        : `event:${event.type}:${automation.id}:${event.accountId}:${event.conversationId ?? "none"}:${event.contactId ?? "none"}:${event.groupId ?? "none"}`;

    const runResult =
      await startPersistentAutomationRun(
        {
          automationId:
            automation.id,

          userId:
            event.userId,

          eventType:
            event.type,

          idempotencyKey,

          eventData: {
            accountId:
              event.accountId,

            conversationId:
              event.conversationId,

            contactId:
              event.contactId,

            groupId:
              event.groupId,

            messageId:
              event.messageId,
          },
        },
      );

    const run =
      runResult.run;

    if (
      runResult.alreadyRunning ||
      runResult.alreadyCompleted
    ) {
      results.push({
        automationId:
          automation.id,

        runId:
          run.id,

        success:
          run.status === "COMPLETED",

        skipped:
          true,

        reason:
          run.status === "COMPLETED"
            ? "AUTOMATION_ALREADY_COMPLETED"
            : "AUTOMATION_ALREADY_RUNNING",
      });

      continue;
    }

    try {
      /*
       * AutomationExecutionContext expects:
       *
       *   sendText(text)
       *
       * RuntimeContext keeps the lower-level WhatsApp
       * sender as:
       *
       *   sendText(recipientPhone, text)
       *
       * Adapt the two contracts here instead of changing
       * the existing automation action engine.
       */
      const executionContext = {
        ...runtime,

        scheduleWait: async (
          config: Record<string, unknown>,
          actionIndex: number,
        ) => {
          return scheduleAutomationAction(
            {
              automationId:
                automation.id,
              userId:
                event.userId,
              accountId:
                event.accountId,
              conversationId:
                event.conversationId,
              recipientPhone:
                event.metadata?.recipientPhone as
                  | string
                  | undefined,
              actions:
                automation.actions.map(
                  (item) => ({
                    type: item.type,
                    config: item.config ?? {},
                  }),
                ),
              startAtIndex:
                actionIndex + 1,
              metadata:
                event.metadata,
            },
            config,
          );
        },

        sendText: runtime.sendText
          ? async (text: string) => {
              const recipientPhone =
                event.metadata?.recipientPhone;

              if (
                typeof recipientPhone !== "string" ||
                !recipientPhone.trim()
              ) {
                throw new Error(
                  "AUTOMATION_RECIPIENT_PHONE_REQUIRED",
                );
              }

              return runtime.sendText!(
                recipientPhone,
                text,
              );
            }
          : undefined,
      };

      const result =
        await executeAutomationActions(
          automation.actions,
          executionContext,
        );

      await completePersistentAutomationRun(
        run.id,
        result,
      );

      results.push({
        automationId:
          automation.id,
        runId:
          run.id,
        success: true,
        result,
      });

      if (
        result.stopped ||
        result.ignored
      ) {
        break;
      }
    } catch (error) {
      await failPersistentAutomationRun(
        run.id,
        error instanceof Error
          ? error.message
          : "Automation execution failed.",
      );

      results.push({
        automationId:
          automation.id,
        runId:
          run.id,
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Automation execution failed.",
      });

      /*
       * One automation failure should not silently
       * prevent other independently matched automations.
       */
      continue;
    }
  }

  return {
    matchedCount:
      selected.length,
    results,
  };
}
