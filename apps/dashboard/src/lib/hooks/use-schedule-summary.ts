import { CUSTOM_SCHEDULE_DEFAULT_INTERVAL_DAYS } from "@notra/ai/constants/schedule-interval";
import { useFormatter, useTranslations } from "next-intl";

import { DAY_MS } from "@/constants/analytics-weekdays";
import { WEEKDAY_REFERENCE_SUNDAY_UTC } from "@/constants/schedule";
import type { ScheduleCron } from "@/types/automation/schedule";

const MINUTE_MS = 60_000;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;

export function useScheduleSummary() {
  const t = useTranslations("automation.schedules.summary");
  const format = useFormatter();

  const formatTime = (hour: number, minute: number) =>
    format.dateTime(new Date(Date.UTC(2024, 0, 1, hour, minute)), {
      hour: "numeric",
      minute: "2-digit",
      timeZone: "UTC",
    });

  const summary = (value: ScheduleCron) => {
    const time = formatTime(value.hour, value.minute);
    if (value.frequency === "weekly") {
      const day = format.dateTime(
        new Date(
          WEEKDAY_REFERENCE_SUNDAY_UTC + (value.dayOfWeek ?? 1) * DAY_MS
        ),
        { weekday: "long", timeZone: "UTC" }
      );
      return t("weekly", { day, time });
    }
    if (value.frequency === "monthly") {
      return t("monthly", { day: value.dayOfMonth ?? 1, time });
    }
    if (value.frequency === "custom") {
      const days = value.intervalDays ?? CUSTOM_SCHEDULE_DEFAULT_INTERVAL_DAYS;
      return t("custom", { days, time });
    }
    return t("daily", { time });
  };

  const relative = (nextRun: Date, now: Date) => {
    const diffMinutes = Math.floor(
      (nextRun.getTime() - now.getTime()) / MINUTE_MS
    );
    if (diffMinutes < 1) {
      return t("anyMoment");
    }
    if (diffMinutes < MINUTES_PER_HOUR) {
      return t("inMinutes", { count: diffMinutes });
    }
    const diffHours = Math.floor(diffMinutes / MINUTES_PER_HOUR);
    if (diffHours < HOURS_PER_DAY) {
      return t("inHours", { count: diffHours });
    }
    return t("inDays", { count: Math.floor(diffHours / HOURS_PER_DAY) });
  };

  const nextRunDate = (nextRun: Date) =>
    format.dateTime(nextRun, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

  return { summary, relative, nextRunDate, t };
}
