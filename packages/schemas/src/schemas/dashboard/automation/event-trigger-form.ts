import "zod/compile";
import { ignoreCommitPatternsSchema } from "@notra/ai/schemas/ignore-commit-patterns";
import {
  MAX_IGNORE_COMMIT_PATTERN_LENGTH,
  MAX_IGNORE_COMMIT_PATTERNS,
  splitIgnoreCommitPatternsText,
} from "@notra/ai/utils/ignore-commit-patterns";
import {
  SUPPORTED_AUTOMATION_OUTPUT_TYPES,
  WEBHOOK_EVENT_TYPES,
} from "@notra/schemas/dashboard/integrations";
// biome-ignore lint/performance/noNamespaceImport: Zod recommended way to import
import * as z from "zod";

export const IGNORE_COMMIT_PATTERNS_TEXT_MAX_LENGTH =
  MAX_IGNORE_COMMIT_PATTERNS * (MAX_IGNORE_COMMIT_PATTERN_LENGTH + 2);

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
    const parsed = ignoreCommitPatternsSchema.safeParse(
      splitIgnoreCommitPatternsText(value.ignoreCommitPatternsText)
    );
    if (!parsed.success) {
      ctx.addIssue({
        code: "custom",
        message: parsed.error.issues[0]?.message ?? "Invalid patterns",
        path: ["ignoreCommitPatternsText"],
      });
    }
  });

export type EventTriggerFormValues = z.infer<typeof eventTriggerFormSchema>;
