import { compileIgnoreCommitPatterns } from "@notra/ai/schemas/ignore-commit-patterns";
import {
  joinIgnoreCommitPatterns,
  MAX_IGNORE_COMMIT_PATTERNS,
  splitIgnoreCommitPatternsText,
} from "@notra/ai/utils/ignore-commit-patterns";

import type { GithubProcessedEvent } from "@/types/webhooks/webhooks";
import { getPushCommitMessages } from "@/utils/push-event-commits";

export const IGNORE_COMMIT_PATTERNS_PLACEHOLDER =
  "^chore(\\(|:), ^docs(\\(|:), \\[skip ci\\]";

export const IGNORE_COMMIT_PATTERN_PRESET_PREFIXES = [
  "chore",
  "docs",
  "ci",
  "test",
  "style",
  "build",
  "refactor",
] as const;

export function buildIgnoreCommitPrefixPattern(prefix: string): string {
  return `^${prefix}(\\(|:)`;
}

export function addIgnoreCommitPatternToText(
  currentText: string,
  pattern: string
): string {
  const lines = splitIgnoreCommitPatternsText(currentText);
  if (lines.includes(pattern) || lines.length >= MAX_IGNORE_COMMIT_PATTERNS) {
    return currentText;
  }
  return joinIgnoreCommitPatterns([...lines, pattern]);
}

export function removeIgnoreCommitPatternFromText(
  currentText: string,
  pattern: string
): string {
  return joinIgnoreCommitPatterns(
    splitIgnoreCommitPatternsText(currentText).filter(
      (line) => line !== pattern
    )
  );
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
  const messages = getPushCommitMessages(processedEvent.data);
  if (messages.length === 0) {
    return false;
  }
  return messages.every((message) =>
    compiled.some((pattern) => pattern.test(message))
  );
}
