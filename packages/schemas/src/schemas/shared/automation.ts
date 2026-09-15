import "zod/compile";
import {
  CUSTOM_SCHEDULE_MAX_INTERVAL_DAYS,
  CUSTOM_SCHEDULE_MIN_INTERVAL_DAYS,
  SCHEDULE_ANCHOR_DATE_PATTERN,
} from "@notra/ai/constants/schedule-interval";
import { z } from "zod";

export const webhookEventTypeSchema = z.enum(["release", "push"]);
export const cronFrequencySchema = z.enum([
  "daily",
  "weekly",
  "monthly",
  "custom",
]);
export const cronIntervalDaysSchema = z
  .number()
  .int()
  .min(CUSTOM_SCHEDULE_MIN_INTERVAL_DAYS)
  .max(CUSTOM_SCHEDULE_MAX_INTERVAL_DAYS);
export const cronAnchorDateSchema = z
  .string()
  .regex(SCHEDULE_ANCHOR_DATE_PATTERN, "Expected YYYY-MM-DD");

export const MAX_IGNORE_COMMIT_PATTERNS = 10;
export const MAX_IGNORE_COMMIT_PATTERN_LENGTH = 120;

/**
 * Conservative guard against catastrophic-backtracking (ReDoS) patterns.
 * Webhook dispatch runs these against every push commit message on the
 * request path, so nested quantifiers, lookarounds, and backreferences —
 * the classic super-linear constructs — are rejected at write time and
 * skipped at dispatch time for legacy rows. Implemented as a small scanner
 * (rather than regex-on-regex) so escaped characters and character classes
 * aren't mistaken for syntax.
 */
export function isUnsafeIgnoreCommitPattern(pattern: string): boolean {
  // Open groups; each entry tracks whether the group body already contains
  // a quantifier at its own level.
  const groupHasQuantifier: boolean[] = [];
  let escaped = false;
  let inClass = false;

  const markQuantifier = () => {
    if (groupHasQuantifier.length > 0) {
      groupHasQuantifier[groupHasQuantifier.length - 1] = true;
    }
  };

  for (let index = 0; index < pattern.length; index += 1) {
    const char = pattern[index] ?? "";
    // \1-\9 are backreferences (\0 is a harmless null escape).
    if (escaped && !inClass && char >= "1" && char <= "9") {
      return true;
    }
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      continue;
    }
    if (inClass) {
      inClass = char !== "]";
      continue;
    }
    if (char === "[") {
      inClass = true;
      continue;
    }
    if (char === "(") {
      const rest = pattern.slice(index + 1, index + 4);
      if (
        rest.startsWith("?=") ||
        rest.startsWith("?!") ||
        rest.startsWith("?<=") ||
        rest.startsWith("?<!")
      ) {
        return true;
      }
      // A "?" here is group syntax (?:, (?<name>, (?i: …), not a quantifier.
      if (pattern[index + 1] === "?") {
        index += 1;
      }
      groupHasQuantifier.push(false);
      continue;
    }
    if (char === ")") {
      const hasInnerQuantifier = groupHasQuantifier.pop() ?? false;
      const next = pattern[index + 1];
      const isQuantified =
        next === "*" ||
        next === "+" ||
        next === "?" ||
        (next === "{" && /\{\d/.test(pattern.slice(index + 1, index + 3)));
      // (a+)+, (a{2}){2} — a quantifier applied to a group that already
      // contains one.
      if (hasInnerQuantifier && isQuantified) {
        return true;
      }
      if (hasInnerQuantifier) {
        // A quantified group nested in another group (((a+))*, (a(x+))):
        // the parent body now contains quantification, so an outer
        // quantifier would nest.
        markQuantifier();
      }
      continue;
    }
    if (char === "*" || char === "+" || char === "?") {
      markQuantifier();
      continue;
    }
    if (char === "{" && /\{\d/.test(pattern.slice(index, index + 2))) {
      markQuantifier();
    }
  }

  return false;
}

const ignoreCommitPatternSchema = z
  .string()
  .trim()
  .min(1)
  .max(MAX_IGNORE_COMMIT_PATTERN_LENGTH)
  .refine((value) => !/[\r\n]/.test(value), "Pattern must be a single line")
  .refine((value) => {
    try {
      new RegExp(value);
      return true;
    } catch {
      return false;
    }
  }, "Invalid regular expression")
  .refine(
    (value) => !isUnsafeIgnoreCommitPattern(value),
    "Pattern may cause catastrophic backtracking; avoid nested quantifiers, lookarounds, and backreferences"
  );

export const eventTriggerSourceConfigSchema = z.object({
  eventTypes: z.array(webhookEventTypeSchema).min(1),
  includePreReleases: z.boolean().default(true),
  ignoreCommitPatterns: z
    .array(ignoreCommitPatternSchema)
    .max(MAX_IGNORE_COMMIT_PATTERNS)
    .default([]),
});
