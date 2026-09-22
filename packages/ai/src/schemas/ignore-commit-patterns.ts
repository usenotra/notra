// biome-ignore lint/performance/noNamespaceImport: Zod recommended way to import
import * as z from "zod";

import {
  isUnsafeIgnoreCommitPattern,
  isValidIgnoreCommitPattern,
  MAX_IGNORE_COMMIT_PATTERN_LENGTH,
  MAX_IGNORE_COMMIT_PATTERNS,
  toIgnoreCommitRegExp,
} from "../utils/ignore-commit-patterns";

const LINE_BREAK_PATTERN = /[\r\n]/;

export const ignoreCommitPatternSchema = z
  .string()
  .trim()
  .min(1)
  .max(MAX_IGNORE_COMMIT_PATTERN_LENGTH)
  .refine(
    (value) => !LINE_BREAK_PATTERN.test(value),
    "Patterns can't span lines"
  )
  .refine(isValidIgnoreCommitPattern, "Not a valid regex")
  .refine(
    (value) => !isUnsafeIgnoreCommitPattern(value),
    "This regex could hang the server. Avoid nested quantifiers, lookarounds and backreferences"
  );

export const ignoreCommitPatternsSchema = z
  .array(ignoreCommitPatternSchema)
  .max(MAX_IGNORE_COMMIT_PATTERNS)
  .refine(
    (patterns) => new Set(patterns).size === patterns.length,
    "Patterns must be unique"
  )
  .default([]);

export const storedIgnoreCommitPatternsSchema = z
  .array(z.unknown())
  .catch([])
  .transform((patterns) => {
    const valid: string[] = [];
    for (const candidate of patterns) {
      const parsed = ignoreCommitPatternSchema.safeParse(candidate);
      if (!parsed.success || valid.includes(parsed.data)) {
        continue;
      }
      valid.push(parsed.data);
      if (valid.length >= MAX_IGNORE_COMMIT_PATTERNS) {
        break;
      }
    }
    return valid;
  });

export const compiledIgnoreCommitPatternsSchema =
  storedIgnoreCommitPatternsSchema.transform((patterns) =>
    patterns.map(toIgnoreCommitRegExp)
  );

export function normalizeIgnoreCommitPatterns(patterns: unknown): string[] {
  return storedIgnoreCommitPatternsSchema.parse(patterns);
}

export function compileIgnoreCommitPatterns(patterns: unknown): RegExp[] {
  return compiledIgnoreCommitPatternsSchema.parse(patterns);
}
