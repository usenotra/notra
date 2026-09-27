import { ignoreCommitPatternsSchema } from "@notra/ai/schemas/ignore-commit-patterns";
import { splitIgnoreCommitPatternsText } from "@notra/ai/utils/ignore-commit-patterns";
import { IGNORE_COMMIT_PATTERNS_TEXT_MAX_LENGTH } from "@notra/schemas/dashboard/automation/event-trigger-form";
import {
  SUPPORTED_AUTOMATION_OUTPUT_TYPES,
  WEBHOOK_EVENT_TYPES,
} from "@notra/schemas/dashboard/integrations";
import { z } from "zod";

import type { EventTriggerFormTranslator } from "@/types/automation/schedule-i18n";

export function createEventTriggerFormSchema(t: EventTriggerFormTranslator) {
  return z
    .object({
      eventType: z.enum(WEBHOOK_EVENT_TYPES),
      outputType: z.enum(SUPPORTED_AUTOMATION_OUTPUT_TYPES),
      repositoryIds: z.array(z.string()).min(1, t("repositoriesRequired")),
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
          message: t("patternsTooLong", {
            max: IGNORE_COMMIT_PATTERNS_TEXT_MAX_LENGTH,
          }),
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
          message: parsed.error.issues[0]?.message ?? t("invalidPatterns"),
          path: ["ignoreCommitPatternsText"],
        });
      }
    });
}
