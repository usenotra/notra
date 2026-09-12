import "zod/compile";
import {
  CRON_FREQUENCIES,
  cronAnchorDateSchema,
  cronIntervalDaysSchema,
  LOOKBACK_WINDOWS,
  MAX_SCHEDULE_INSTRUCTIONS_LENGTH,
  MAX_SCHEDULE_NAME_LENGTH,
  SUPPORTED_AUTOMATION_OUTPUT_TYPES,
} from "@notra/schemas/dashboard/integrations";
// biome-ignore lint/performance/noNamespaceImport: Zod recommended way to import
import * as z from "zod";

export const scheduleCronSchema = z
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
    (value) => value.frequency !== "custom" || value.intervalDays !== undefined,
    { path: ["intervalDays"], message: "Enter how many days between runs" }
  );

export type ScheduleCron = z.infer<typeof scheduleCronSchema>;

export const scheduleFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Give this schedule a name")
    .max(MAX_SCHEDULE_NAME_LENGTH),
  outputType: z.enum(SUPPORTED_AUTOMATION_OUTPUT_TYPES),
  instructions: z
    .string()
    .trim()
    .max(
      MAX_SCHEDULE_INSTRUCTIONS_LENGTH,
      `Keep instructions under ${MAX_SCHEDULE_INSTRUCTIONS_LENGTH} characters`
    ),
  schedule: scheduleCronSchema,
  repositoryIds: z
    .array(z.string())
    .refine((ids) => ids.length > 0, "Pick at least one source to continue")
    .refine(
      (ids) => ids.some((id) => !id.startsWith("linear:")),
      "Schedules need at least one GitHub repository"
    ),
  lookbackWindow: z.enum(LOOKBACK_WINDOWS),
  brandVoiceId: z.string(),
  autoPublish: z.boolean(),
});

export type ScheduleFormValues = z.infer<typeof scheduleFormSchema>;
