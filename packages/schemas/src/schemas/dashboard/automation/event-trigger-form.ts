import "zod/compile";
import {
  isUnsafeIgnoreCommitPattern,
  MAX_IGNORE_COMMIT_PATTERN_LENGTH,
  MAX_IGNORE_COMMIT_PATTERNS,
  SUPPORTED_AUTOMATION_OUTPUT_TYPES,
  WEBHOOK_EVENT_TYPES,
} from "@notra/schemas/dashboard/integrations";
// biome-ignore lint/performance/noNamespaceImport: Zod recommended way to import
import * as z from "zod";

export const IGNORE_COMMIT_PATTERNS_TEXT_MAX_LENGTH =
  MAX_IGNORE_COMMIT_PATTERNS * (MAX_IGNORE_COMMIT_PATTERN_LENGTH + 1);

export const eventTriggerFormSchema = z
  .object({
    eventType: z.enum(WEBHOOK_EVENT_TYPES),
    outputType: z.enum(SUPPORTED_AUTOMATION_OUTPUT_TYPES),
    repositoryIds: z.array(z.string()).min(1, "Select at least one repository"),
    brandVoiceId: z.string(),
    autoPublish: z.boolean(),
    includePreReleases: z.boolean(),
    ignoreCommitPatternsText: z.string(),
  })
  .superRefine((value, ctx) => {
    // The patterns field is push-only (hidden and discarded for release),
    // so none of its checks may block release-trigger submission.
    if (value.eventType !== "push") {
      return;
    }
    if (
      value.ignoreCommitPatternsText.length >
      IGNORE_COMMIT_PATTERNS_TEXT_MAX_LENGTH
    ) {
      ctx.addIssue({
        code: "custom",
        message: `Must be ${IGNORE_COMMIT_PATTERNS_TEXT_MAX_LENGTH} characters or less`,
        path: ["ignoreCommitPatternsText"],
      });
      return;
    }
    const lines = value.ignoreCommitPatternsText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length > MAX_IGNORE_COMMIT_PATTERNS) {
      ctx.addIssue({
        code: "custom",
        message: `Use at most ${MAX_IGNORE_COMMIT_PATTERNS} patterns (one per line)`,
        path: ["ignoreCommitPatternsText"],
      });
      return;
    }
    for (const line of lines) {
      if (line.length > MAX_IGNORE_COMMIT_PATTERN_LENGTH) {
        ctx.addIssue({
          code: "custom",
          message: `Each pattern must be ${MAX_IGNORE_COMMIT_PATTERN_LENGTH} characters or less`,
          path: ["ignoreCommitPatternsText"],
        });
        return;
      }
      try {
        new RegExp(line);
      } catch {
        ctx.addIssue({
          code: "custom",
          message: `Invalid regular expression: ${line}`,
          path: ["ignoreCommitPatternsText"],
        });
        return;
      }
      if (isUnsafeIgnoreCommitPattern(line)) {
        ctx.addIssue({
          code: "custom",
          message: `Unsafe regular expression: ${line}`,
          path: ["ignoreCommitPatternsText"],
        });
        return;
      }
    }
  });

export type EventTriggerFormValues = z.infer<typeof eventTriggerFormSchema>;
