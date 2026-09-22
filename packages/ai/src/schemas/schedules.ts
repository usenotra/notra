import {
  CUSTOM_SCHEDULE_MAX_INTERVAL_DAYS,
  CUSTOM_SCHEDULE_MIN_INTERVAL_DAYS,
  SCHEDULE_ANCHOR_DATE_PATTERN,
} from "@notra/ai/constants/schedule-interval";
import { parseUtcDate } from "@notra/ai/utils/schedule-interval";
import { z } from "zod";

export const SCHEDULE_OUTPUT_TYPES = [
  "changelog",
  "blog_post",
  "linkedin_post",
  "twitter_post",
  "image",
] as const;

export const SCHEDULE_LOOKBACK_WINDOWS = [
  "current_day",
  "yesterday",
  "last_7_days",
  "last_14_days",
  "last_30_days",
] as const;

export const SCHEDULE_FREQUENCIES = [
  "daily",
  "weekly",
  "monthly",
  "custom",
] as const;

const MAX_SCHEDULE_NAME_LENGTH = 120;
const MAX_SCHEDULE_INSTRUCTIONS_LENGTH = 2000;

const scheduleFields = {
  name: z
    .string()
    .trim()
    .min(1)
    .max(MAX_SCHEDULE_NAME_LENGTH)
    .describe("Short name for the schedule, shown in Automations."),
  outputType: z
    .enum(SCHEDULE_OUTPUT_TYPES)
    .describe(
      "Content drafted each run: changelog, blog_post, linkedin_post, twitter_post, or image."
    ),
  repositoryIds: z
    .array(z.string().trim().min(1))
    .min(1)
    .describe(
      "GitHub integration IDs this schedule reads. Use integrationId values from the prompt or getAvailableIntegrations."
    ),
  hour: z
    .number()
    .int()
    .min(0)
    .max(23)
    .describe(
      "Hour of day in UTC (0-23). Convert the user's local time to UTC before setting this."
    ),
  minute: z
    .number()
    .int()
    .min(0)
    .max(59)
    .default(0)
    .describe("Minute of the hour in UTC (0-59)."),
  lookbackWindow: z
    .enum(SCHEDULE_LOOKBACK_WINDOWS)
    .default("last_7_days")
    .describe(
      "How far back each run looks for shipped work. Defaults to last_7_days."
    ),
  instructions: z
    .string()
    .trim()
    .min(1)
    .max(MAX_SCHEDULE_INSTRUCTIONS_LENGTH)
    .optional()
    .describe(
      "Optional brief applied to every run, such as tone or what to emphasize."
    ),
  brandVoiceId: z
    .string()
    .trim()
    .min(1)
    .optional()
    .describe(
      "Optional brand identity id. Omit it to use the workspace default."
    ),
  autoPublish: z
    .boolean()
    .default(false)
    .describe(
      "Publish the draft automatically. Leave false unless the user explicitly asks for that."
    ),
  enabled: z
    .boolean()
    .default(true)
    .describe(
      "Start the schedule immediately. Set false only to save it paused."
    ),
};

export const createScheduleInputSchema = z.discriminatedUnion("frequency", [
  z.object({
    ...scheduleFields,
    frequency: z.literal("daily").describe("Run every day."),
  }),
  z.object({
    ...scheduleFields,
    frequency: z.literal("weekly").describe("Run once a week."),
    dayOfWeek: z
      .number()
      .int()
      .min(0)
      .max(6)
      .describe("0 is Sunday through 6 Saturday, in UTC."),
  }),
  z.object({
    ...scheduleFields,
    frequency: z.literal("monthly").describe("Run once a month."),
    dayOfMonth: z
      .number()
      .int()
      .min(1)
      .max(31)
      .describe("Day of the month, 1-31, in UTC."),
  }),
  z.object({
    ...scheduleFields,
    frequency: z
      .literal("custom")
      .describe("Run every N days at the chosen UTC time."),
    intervalDays: z
      .number()
      .int()
      .min(CUSTOM_SCHEDULE_MIN_INTERVAL_DAYS)
      .max(CUSTOM_SCHEDULE_MAX_INTERVAL_DAYS)
      .describe(
        `Run every N days (${CUSTOM_SCHEDULE_MIN_INTERVAL_DAYS}-${CUSTOM_SCHEDULE_MAX_INTERVAL_DAYS}).`
      ),
    anchorDate: z
      .string()
      .regex(SCHEDULE_ANCHOR_DATE_PATTERN, "Expected YYYY-MM-DD")
      .refine((value) => parseUtcDate(value) !== null, {
        message: "Expected a valid UTC calendar date",
      })
      .optional()
      .describe(
        "UTC date (YYYY-MM-DD) the interval counts from. Defaults to today."
      ),
  }),
]);

export type CreateScheduleInput = z.infer<typeof createScheduleInputSchema>;
