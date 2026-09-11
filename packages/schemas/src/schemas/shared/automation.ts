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

export const eventTriggerSourceConfigSchema = z.object({
  eventTypes: z.array(webhookEventTypeSchema).min(1),
  includePreReleases: z.boolean().default(true),
});
