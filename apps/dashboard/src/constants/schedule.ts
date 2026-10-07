import type { ScheduleCron } from "@/types/automation/schedule";

export const DEFAULT_SCHEDULE: ScheduleCron = {
  frequency: "daily",
  hour: 9,
  minute: 0,
};

export const DAYS_OF_WEEK: readonly number[] = [1, 2, 3, 4, 5, 6, 0];

export const WEEKDAY_REFERENCE_SUNDAY_UTC = Date.UTC(2024, 0, 7);

export const DAYS_OF_MONTH: number[] = Array.from(
  { length: 31 },
  (_, i) => i + 1
);

export const LOOKBACK_WINDOW_COMMON_LABEL_KEYS = {
  yesterday: "yesterday",
  last_7_days: "last7Days",
  last_14_days: "last14Days",
  last_30_days: "last30Days",
} as const;
