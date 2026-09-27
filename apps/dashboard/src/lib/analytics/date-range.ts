import {
  ANALYTICS_ALL_TIME_START,
  ANALYTICS_RANGE_PRESET_DAYS,
  ANALYTICS_RANGE_PRESETS,
} from "@/constants/analytics";
import type {
  AnalyticsDateRange,
  AnalyticsRangePreset,
  AnalyticsRangeState,
} from "@/types/analytics";

const DAY_PAD_LENGTH = 2;
const MAX_TIMELINE_DAYS = 400;
const CUSTOM_PARAM_REGEX = /^custom_(\d{4}-\d{2}-\d{2})_(\d{4}-\d{2}-\d{2})$/;

export function localDayString(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(DAY_PAD_LENGTH, "0");
  const day = String(date.getDate()).padStart(DAY_PAD_LENGTH, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function parseLocalDay(day: string): Date {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(year ?? 0, (month ?? 1) - 1, date ?? 1);
}

const MONTHS_PER_QUARTER = 3;

function shiftedDay(offsetDays: number): string {
  const date = new Date();
  date.setDate(date.getDate() - offsetDays);
  return localDayString(date);
}

function firstOfMonth(month: number): string {
  return localDayString(new Date(new Date().getFullYear(), month, 1));
}

function presetRange(
  preset: Exclude<AnalyticsRangePreset, "custom">
): AnalyticsDateRange {
  const today = shiftedDay(0);
  switch (preset) {
    case "yesterday":
      return { dateFrom: shiftedDay(1), dateTo: shiftedDay(1) };
    case "mtd":
      return { dateFrom: firstOfMonth(new Date().getMonth()), dateTo: today };
    case "qtd":
      return {
        dateFrom: firstOfMonth(
          Math.floor(new Date().getMonth() / MONTHS_PER_QUARTER) *
            MONTHS_PER_QUARTER
        ),
        dateTo: today,
      };
    case "ytd":
      return { dateFrom: firstOfMonth(0), dateTo: today };
    case "all":
      return { dateFrom: ANALYTICS_ALL_TIME_START, dateTo: today };
    default:
      return {
        dateFrom: shiftedDay(ANALYTICS_RANGE_PRESET_DAYS[preset]),
        dateTo: today,
      };
  }
}

function isPresetValue(
  value: string
): value is Exclude<AnalyticsRangePreset, "custom"> {
  return ANALYTICS_RANGE_PRESETS.some((preset) => preset.value === value);
}

export function parseRangeParam(
  value: string,
  fallback: Exclude<AnalyticsRangePreset, "custom">
): AnalyticsRangeState {
  if (isPresetValue(value)) {
    return { preset: value, range: presetRange(value) };
  }
  const match = CUSTOM_PARAM_REGEX.exec(value);
  if (match?.[1] && match[2] && match[1] <= match[2]) {
    return {
      preset: "custom",
      range: { dateFrom: match[1], dateTo: match[2] },
    };
  }
  return { preset: fallback, range: presetRange(fallback) };
}

export function serializeCustomRange(range: AnalyticsDateRange): string {
  return `custom_${range.dateFrom}_${range.dateTo}`;
}

export function rangeIncludesToday(range: AnalyticsDateRange): boolean {
  return range.dateTo >= localDayString(new Date());
}

export function buildTimelineRange(range: AnalyticsDateRange): string[] {
  const end = parseLocalDay(range.dateTo);
  const start = parseLocalDay(range.dateFrom);
  // Cap very long ranges (e.g. "all time") to the most recent window so the
  // chart anchors on where the data actually is instead of empty early days.
  const capStart = new Date(end);
  capStart.setDate(capStart.getDate() - (MAX_TIMELINE_DAYS - 1));
  const cursor = start.getTime() < capStart.getTime() ? capStart : start;
  const endMs = end.getTime();
  const result: string[] = [];
  while (cursor.getTime() <= endMs) {
    result.push(localDayString(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return result;
}
