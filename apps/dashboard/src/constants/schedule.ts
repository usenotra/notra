import {
  CRON_FREQUENCIES,
  type CronFrequency,
} from "@notra/schemas/dashboard/integrations";

import type { ScheduleCron } from "@/types/automation/schedule";

export const DEFAULT_SCHEDULE: ScheduleCron = {
  frequency: "daily",
  hour: 9,
  minute: 0,
};

export const FREQUENCY_LABELS: Record<CronFrequency, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  custom: "Custom",
};

export const FREQUENCY_OPTIONS: Array<{
  value: CronFrequency;
  label: string;
}> = CRON_FREQUENCIES.map((value) => ({
  value,
  label: FREQUENCY_LABELS[value],
}));

export const DAY_NAMES_LONG = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export const DAYS_OF_WEEK: Array<{ value: number; label: string }> = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
];

export const DAYS_OF_MONTH: number[] = Array.from(
  { length: 31 },
  (_, i) => i + 1
);
