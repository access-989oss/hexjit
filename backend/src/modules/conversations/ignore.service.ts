export type IgnoreDecision = {
  ignored: boolean;
  reason:
    | "CONTACT_IGNORED"
    | "GROUP_IGNORED"
    | "NONE";
};

export function evaluateIgnoreRule(input: {
  contactIgnored?: boolean;
  groupIgnored?: boolean;
}): IgnoreDecision {
  if (input.contactIgnored === true) {
    return {
      ignored: true,
      reason: "CONTACT_IGNORED",
    };
  }

  if (input.groupIgnored === true) {
    return {
      ignored: true,
      reason: "GROUP_IGNORED",
    };
  }

  return {
    ignored: false,
    reason: "NONE",
  };
}
