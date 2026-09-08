import {
  FILTER_ACTIONS,
  MESSAGE_CLASSIFICATIONS,
  type FilterAction,
  type MessageFilterResult,
} from "./filter.types.js";

export type FilterPolicyInput = {
  classifier: MessageFilterResult;
  explicitlyIgnored?: boolean;
  trustedContact?: boolean;
  spamProtectionEnabled?: boolean;
  promotionalProtectionEnabled?: boolean;
  suspiciousProtectionEnabled?: boolean;
};

export function applyFilterPolicy(
  input: FilterPolicyInput,
): MessageFilterResult {
  /*
   * Explicit ignore always wins.
   */
  if (input.explicitlyIgnored) {
    return {
      ...input.classifier,
      action: FILTER_ACTIONS.IGNORE,
      reasons: [
        "Explicit ignore rule is active.",
        ...input.classifier.reasons,
      ],
    };
  }

  /*
   * Trusted contacts bypass automatic spam/promotion
   * suppression unless the message is classified as
   * strongly suspicious.
   */
  if (
    input.trustedContact &&
    input.classifier.classification !==
      MESSAGE_CLASSIFICATIONS.SUSPICIOUS
  ) {
    return {
      ...input.classifier,
      action: FILTER_ACTIONS.ALLOW,
      reasons: [
        "Trusted contact.",
        ...input.classifier.reasons,
      ],
    };
  }

  if (
    input.classifier.classification ===
      MESSAGE_CLASSIFICATIONS.SPAM &&
    input.spamProtectionEnabled !== false
  ) {
    return {
      ...input.classifier,
      action: FILTER_ACTIONS.IGNORE,
    };
  }

  if (
    input.classifier.classification ===
      MESSAGE_CLASSIFICATIONS.PROMOTIONAL
  ) {
    return {
      ...input.classifier,
      action:
        input.promotionalProtectionEnabled !==
        false
          ? FILTER_ACTIONS.IGNORE
          : FILTER_ACTIONS.ALLOW,
    };
  }

  if (
    input.classifier.classification ===
      MESSAGE_CLASSIFICATIONS.SUSPICIOUS
  ) {
    return {
      ...input.classifier,
      action:
        input.suspiciousProtectionEnabled !==
        false
          ? FILTER_ACTIONS.FLAG
          : FILTER_ACTIONS.ALLOW,
    };
  }

  return input.classifier;
}
