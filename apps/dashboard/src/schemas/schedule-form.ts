import {
  CRON_FREQUENCIES,
  cronAnchorDateSchema,
  cronIntervalDaysSchema,
  LOOKBACK_WINDOWS,
  MAX_SCHEDULE_INSTRUCTIONS_LENGTH,
  MAX_SCHEDULE_NAME_LENGTH,
  SUPPORTED_AUTOMATION_OUTPUT_TYPES,
} from "@notra/schemas/dashboard/integrations";
import { z } from "zod";

import type { ScheduleFormTranslator } from "@/types/automation/schedule-i18n";

export function createScheduleFormSchema(t: ScheduleFormTranslator) {
  const scheduleCronSchema = z
    .object({
      frequency: z.enum(CRON_FREQUENCIES),
      hour: z.number().int().min(0).max(23),
      minute: z.number().int().min(0).max(59),
      dayOfWeek: z.number().int().min(0).max(6).optional(),
      dayOfMonth: z.number().int().min(1).max(31).optional(),
      intervalDays: cronIntervalDaysSchema.optional(),
      anchorDate: cronAnchorDateSchema.optional(),
    })
    .refine(
      (value) =>
        value.frequency !== "custom" || value.intervalDays !== undefined,
      { path: ["intervalDays"], message: t("intervalRequired") }
    );

  return z.object({
    name: z
      .string()
      .trim()
      .min(1, t("nameRequired"))
      .max(MAX_SCHEDULE_NAME_LENGTH),
    outputType: z.enum(SUPPORTED_AUTOMATION_OUTPUT_TYPES),
    instructions: z
      .string()
      .trim()
      .max(
        MAX_SCHEDULE_INSTRUCTIONS_LENGTH,
        t("instructionsTooLong", { max: MAX_SCHEDULE_INSTRUCTIONS_LENGTH })
      ),
    schedule: scheduleCronSchema,
    repositoryIds: z
      .array(z.string())
      .refine((ids) => ids.length > 0, t("sourcesRequired"))
      .refine(
        (ids) => ids.some((id) => !id.startsWith("linear:")),
        t("githubRequired")
      ),
    lookbackWindow: z.enum(LOOKBACK_WINDOWS),
    brandVoiceId: z.string(),
    autoPublish: z.boolean(),
  });
}
