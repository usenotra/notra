import type {
  LookbackWindow,
  ScheduleOutputType,
} from "@notra/schemas/dashboard/integrations";

import type { ScheduleCron } from "@/types/automation/schedule";

export type SchedulePresetId =
  | "weekly-changelog"
  | "daily-twitter"
  | "monthly-blog"
  | "biweekly-linkedin";

export interface SchedulePreset {
  id: SchedulePresetId;
  label: string;
  description: string;
  values: {
    outputType: ScheduleOutputType;
    schedule: ScheduleCron;
    lookbackWindow: LookbackWindow;
  };
}

export const SCHEDULE_PRESETS: SchedulePreset[] = [
  {
    id: "weekly-changelog",
    label: "Weekly changelog",
    description: "Summarize the week's activity every Monday morning.",
    values: {
      outputType: "changelog",
      schedule: { frequency: "weekly", dayOfWeek: 1, hour: 9, minute: 0 },
      lookbackWindow: "last_7_days",
    },
  },
  {
    id: "daily-twitter",
    label: "Daily X post",
    description: "Share a short update from yesterday's activity.",
    values: {
      outputType: "twitter_post",
      schedule: { frequency: "daily", hour: 9, minute: 0 },
      lookbackWindow: "yesterday",
    },
  },
  {
    id: "monthly-blog",
    label: "Monthly blog post",
    description: "Turn the month's highlights into a long-form article.",
    values: {
      outputType: "blog_post",
      schedule: { frequency: "monthly", dayOfMonth: 1, hour: 9, minute: 0 },
      lookbackWindow: "last_30_days",
    },
  },
  {
    id: "biweekly-linkedin",
    label: "Bi-weekly LinkedIn post",
    description: "Post a professional update every two weeks.",
    values: {
      outputType: "linkedin_post",
      // anchorDate is filled in by getPresetScheduleValues so the
      // preset never goes stale.
      schedule: { frequency: "custom", intervalDays: 14, hour: 9, minute: 0 },
      lookbackWindow: "last_14_days",
    },
  },
];
