import {
  MESSAGE_CLASSIFICATIONS,
  FILTER_ACTIONS,
  type MessageFilterResult,
} from "./filter.types.js";

const promotionalPatterns = [
  /\boffer\b/i,
  /\bdiscount\b/i,
  /\bsale\b/i,
  /\bpromo\b/i,
  /\bpromotion\b/i,
  /\bcoupon\b/i,
  /\bdeal\b/i,
  /\bfree\b/i,
  /\bsubscribe\b/i,
  /\bbuy now\b/i,
  /\blimited time\b/i,
  /\bclick here\b/i,
];

const suspiciousPatterns = [
  /\bverify your account\b/i,
  /\bverification code\b/i,
  /\botp\b/i,
  /\bpassword\b/i,
  /\bcredit card\b/i,
  /\bbank account\b/i,
  /\burgent\b/i,
  /\bclaim your prize\b/i,
  /\byou won\b/i,
];

const spamPatterns = [
  /\bmake money fast\b/i,
  /\bwork from home\b/i,
  /\bdouble your money\b/i,
  /\bcrypto giveaway\b/i,
  /\bairdrop\b/i,
  /\bfree money\b/i,
];

function countMatches(
  text: string,
  patterns: RegExp[],
): string[] {
  return patterns
    .filter((pattern) => pattern.test(text))
    .map((pattern) => pattern.source);
}

export function classifyMessageByRules(
  text: string,
): MessageFilterResult {
  const normalized = text.trim();

  if (!normalized) {
    return {
      classification:
        MESSAGE_CLASSIFICATIONS.NORMAL,
      action: FILTER_ACTIONS.ALLOW,
      score: 0,
      reasons: [],
    };
  }

  const promotionalMatches =
    countMatches(
      normalized,
      promotionalPatterns,
    );

  const suspiciousMatches =
    countMatches(
      normalized,
      suspiciousPatterns,
    );

  const spamMatches =
    countMatches(
      normalized,
      spamPatterns,
    );

  /*
   * Highest confidence: explicit spam signals.
   */
  if (spamMatches.length > 0) {
    return {
      classification:
        MESSAGE_CLASSIFICATIONS.SPAM,
      action: FILTER_ACTIONS.IGNORE,
      score: Math.min(
        1,
        0.85 +
          spamMatches.length * 0.04,
      ),
      reasons: [
        "Strong spam language detected.",
        ...spamMatches,
      ],
    };
  }

  /*
   * Sensitive/social-engineering signals.
   */
  if (suspiciousMatches.length >= 2) {
    return {
      classification:
        MESSAGE_CLASSIFICATIONS.SUSPICIOUS,
      action: FILTER_ACTIONS.FLAG,
      score: Math.min(
        1,
        0.70 +
          suspiciousMatches.length * 0.05,
      ),
      reasons: [
        "Multiple suspicious signals detected.",
        ...suspiciousMatches,
      ],
    };
  }

  /*
   * Promotion with multiple indicators.
   */
  if (promotionalMatches.length >= 2) {
    return {
      classification:
        MESSAGE_CLASSIFICATIONS.PROMOTIONAL,
      action: FILTER_ACTIONS.IGNORE,
      score: Math.min(
        1,
        0.65 +
          promotionalMatches.length * 0.05,
      ),
      reasons: [
        "Promotional content detected.",
        ...promotionalMatches,
      ],
    };
  }

  /*
   * Single suspicious signal: flag rather than
   * automatically suppress.
   */
  if (suspiciousMatches.length === 1) {
    return {
      classification:
        MESSAGE_CLASSIFICATIONS.SUSPICIOUS,
      action: FILTER_ACTIONS.FLAG,
      score: 0.55,
      reasons: [
        "Potentially suspicious content detected.",
        ...suspiciousMatches,
      ],
    };
  }

  if (promotionalMatches.length === 1) {
    return {
      classification:
        MESSAGE_CLASSIFICATIONS.PROMOTIONAL,
      action: FILTER_ACTIONS.FLAG,
      score: 0.50,
      reasons: [
        "Possible promotional content detected.",
        ...promotionalMatches,
      ],
    };
  }

  return {
    classification:
      MESSAGE_CLASSIFICATIONS.NORMAL,
    action: FILTER_ACTIONS.ALLOW,
    score: 0.05,
    reasons: [],
  };
}
