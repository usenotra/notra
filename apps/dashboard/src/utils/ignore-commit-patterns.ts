import {
  isUnsafeIgnoreCommitPattern,
  MAX_IGNORE_COMMIT_PATTERN_LENGTH,
  MAX_IGNORE_COMMIT_PATTERNS,
} from "@notra/schemas/dashboard/integrations";

import type { GithubProcessedEvent } from "@/types/webhooks/webhooks";

export const IGNORE_COMMIT_PATTERNS_PLACEHOLDER = "^chore(\\(|:)";

/**
 * One-click conventional-commit prefixes for users who don't write regex.
 * Each prefix maps to an anchored `^prefix(\(|:)` pattern matching both
 * `prefix: ...` and `prefix(scope): ...` messages.
 */
export const IGNORE_COMMIT_PATTERN_PRESET_PREFIXES = [
  "chore",
  "docs",
  "ci",
  "test",
  "style",
  "build",
  "refactor",
] as const;

export type IgnoreCommitPatternPresetPrefix =
  (typeof IGNORE_COMMIT_PATTERN_PRESET_PREFIXES)[number];

export function buildIgnoreCommitPrefixPattern(prefix: string): string {
  return `^${prefix}(\\(|:)`;
}

/**
 * Append a preset pattern to the textarea text. Returns the unchanged text
 * when the pattern is already present or the pattern cap is reached, so
 * callers can treat identity as "nothing to do".
 */
export function addIgnoreCommitPatternToText(
  currentText: string,
  pattern: string
): string {
  const lines = currentText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.includes(pattern) || lines.length >= MAX_IGNORE_COMMIT_PATTERNS) {
    return currentText;
  }
  return [...lines, pattern].join("\n");
}

/**
 * Compile stored ignore-commit patterns to regexes. Matching is
 * case-sensitive, unanchored `RegExp.test` (substring unless the user
 * anchors with `^`/`$` or passes flags inline, e.g. `(?i)` is not
 * supported — use character classes).
 *
 * Patterns are org-trusted input, bounded by MAX_IGNORE_COMMIT_PATTERNS (10)
 * and MAX_IGNORE_COMMIT_PATTERN_LENGTH (120). Patterns with ReDoS-prone
 * syntax are skipped (write-time validation rejects them; this covers
 * legacy rows) so a pathological pattern can never stall dispatch.
 * Invalid patterns are skipped and must never block dispatch.
 */
export function compileIgnoreCommitPatterns(patterns: unknown): RegExp[] {
  if (!Array.isArray(patterns)) {
    return [];
  }

  const compiled: RegExp[] = [];
  const seen = new Set<string>();

  for (const pattern of patterns) {
    if (typeof pattern !== "string") {
      continue;
    }
    const trimmed = pattern.trim();
    if (
      !trimmed ||
      trimmed.length > MAX_IGNORE_COMMIT_PATTERN_LENGTH ||
      seen.has(trimmed) ||
      isUnsafeIgnoreCommitPattern(trimmed)
    ) {
      continue;
    }
    seen.add(trimmed);
    try {
      compiled.push(new RegExp(trimmed));
    } catch {
      // Invalid stored patterns must never block dispatch.
    }
    if (compiled.length >= MAX_IGNORE_COMMIT_PATTERNS) {
      break;
    }
  }

  return compiled;
}

export function isCommitMessageIgnored(
  message: unknown,
  patterns: RegExp[]
): boolean {
  if (typeof message !== "string" || patterns.length === 0) {
    return false;
  }
  return patterns.some((pattern) => pattern.test(message));
}

export function isPushEventIgnoredByPatterns(
  processedEvent: GithubProcessedEvent,
  patterns: unknown
): boolean {
  if (processedEvent.type !== "push") {
    return false;
  }
  const compiled = compileIgnoreCommitPatterns(patterns);
  if (compiled.length === 0) {
    return false;
  }
  const commits = (processedEvent.data as { commits?: unknown }).commits;
  if (!Array.isArray(commits) || commits.length === 0) {
    return false;
  }
  return commits.every((commit) =>
    isCommitMessageIgnored(
      (commit as { message?: unknown } | null)?.message,
      compiled
    )
  );
}
