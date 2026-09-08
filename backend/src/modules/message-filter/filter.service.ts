import {
  classifyMessageByRules,
} from "./rule-detector.service.js";

import {
  applyFilterPolicy,
  type FilterPolicyInput,
} from "./filter-policy.service.js";

export function filterIncomingMessage(
  input: Omit<
    FilterPolicyInput,
    "classifier"
  > & {
    text: string;
  },
) {
  const classifier =
    classifyMessageByRules(
      input.text,
    );

  return applyFilterPolicy({
    ...input,
    classifier,
  });
}
