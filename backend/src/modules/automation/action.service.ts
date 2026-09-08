import {
  AUTOMATION_ACTIONS,
  type AutomationActionConfig,
} from "./automation.types.js";

export type AutomationExecutionContext = {
  sendText?: (
    text: string,
  ) => Promise<unknown>;

  sendImage?: (
    input: Record<string, unknown>,
  ) => Promise<unknown>;

  analyzeImage?: (
    input: Record<string, unknown>,
  ) => Promise<unknown>;

  aiReply?: (
    input: Record<string, unknown>,
  ) => Promise<unknown>;

  scheduleFollowUp?: (
    input: Record<string, unknown>,
  ) => Promise<unknown>;
};

export type AutomationExecutionResult = {
  stopped: boolean;
  ignored: boolean;
  executedActions: string[];
};

export async function executeAutomationActions(
  actions: AutomationActionConfig[],
  context: AutomationExecutionContext,
): Promise<AutomationExecutionResult> {
  const result: AutomationExecutionResult = {
    stopped: false,
    ignored: false,
    executedActions: [],
  };

  for (const action of actions) {
    switch (action.type) {
      case AUTOMATION_ACTIONS.AI_REPLY:
        if (!context.aiReply) {
          throw new Error(
            "AI_REPLY_HANDLER_NOT_CONFIGURED",
          );
        }

        await context.aiReply(
          action.config ?? {},
        );

        result.executedActions.push(
          action.type,
        );
        break;

      case AUTOMATION_ACTIONS.SEND_TEXT:
        if (!context.sendText) {
          throw new Error(
            "SEND_TEXT_HANDLER_NOT_CONFIGURED",
          );
        }

        await context.sendText(
          typeof action.config
            ?.text === "string"
            ? action.config.text
            : "",
        );

        result.executedActions.push(
          action.type,
        );
        break;

      case AUTOMATION_ACTIONS.SEND_IMAGE:
        if (!context.sendImage) {
          throw new Error(
            "SEND_IMAGE_HANDLER_NOT_CONFIGURED",
          );
        }

        await context.sendImage(
          action.config ?? {},
        );

        result.executedActions.push(
          action.type,
        );
        break;

      case AUTOMATION_ACTIONS.ANALYZE_IMAGE:
        if (!context.analyzeImage) {
          throw new Error(
            "ANALYZE_IMAGE_HANDLER_NOT_CONFIGURED",
          );
        }

        await context.analyzeImage(
          action.config ?? {},
        );

        result.executedActions.push(
          action.type,
        );
        break;

      case AUTOMATION_ACTIONS.WAIT:
        /*
         * WAIT is represented by the scheduler layer.
         * The automation worker must never block with
         * setTimeout.
         */
        result.executedActions.push(
          action.type,
        );
        break;

      case AUTOMATION_ACTIONS.FOLLOW_UP:
        if (!context.scheduleFollowUp) {
          throw new Error(
            "FOLLOW_UP_HANDLER_NOT_CONFIGURED",
          );
        }

        await context.scheduleFollowUp(
          action.config ?? {},
        );

        result.executedActions.push(
          action.type,
        );
        break;

      case AUTOMATION_ACTIONS.IGNORE:
        result.ignored = true;
        result.executedActions.push(
          action.type,
        );
        return result;

      case AUTOMATION_ACTIONS.STOP:
        result.stopped = true;
        result.executedActions.push(
          action.type,
        );
        return result;

      default:
        throw new Error(
          `UNKNOWN_AUTOMATION_ACTION:${action.type}`,
        );
    }
  }

  return result;
}
