import { CUSTOM_SCHEDULE_DEFAULT_INTERVAL_DAYS } from "@notra/ai/constants/schedule-interval";
import { useFormatter, useTranslations } from "next-intl";

import { DAY_MS } from "@/constants/analytics-weekdays";
import { WEEKDAY_REFERENCE_SUNDAY_UTC } from "@/constants/schedule";
import type { Trigger } from "@/types/triggers/triggers";

export function useScheduleFrequencyLabel() {
  const t = useTranslations("automation.schedules.frequencyLabel");
  const format = useFormatter();
  return (cron?: Trigger["sourceConfig"]["cron"]) => {
    if (!cron) {
      return t("notSet");
    }
    const time = `${String(cron.hour).padStart(2, "0")}:${String(cron.minute).padStart(2, "0")} UTC`;
    if (cron.frequency === "weekly") {
      const day = format.dateTime(
        new Date(WEEKDAY_REFERENCE_SUNDAY_UTC + (cron.dayOfWeek ?? 0) * DAY_MS),
        { weekday: "short", timeZone: "UTC" }
      );
      return t("weekly", { day, time });
    }
    if (cron.frequency === "monthly") {
      return t("monthly", { day: cron.dayOfMonth ?? 1, time });
    }
    if (cron.frequency === "custom") {
      return t("custom", {
        days: cron.intervalDays ?? CUSTOM_SCHEDULE_DEFAULT_INTERVAL_DAYS,
        time,
      });
    }
    return t("daily", { time });
  };
}
