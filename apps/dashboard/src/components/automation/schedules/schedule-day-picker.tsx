"use client";

import { Label } from "@notra/ui/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@notra/ui/components/ui/select";
import { cn } from "@notra/ui/lib/utils";
import { useFormatter, useTranslations } from "next-intl";

import { DAY_MS } from "@/constants/analytics-weekdays";
import {
  DAYS_OF_MONTH,
  DAYS_OF_WEEK,
  WEEKDAY_REFERENCE_SUNDAY_UTC,
} from "@/constants/schedule";
import type { ScheduleDayPickerProps } from "@/types/automation/schedule";

export function ScheduleDayPicker({
  frequency,
  dayOfWeek,
  dayOfMonth,
  onDayOfWeekChange,
  onDayOfMonthChange,
}: ScheduleDayPickerProps) {
  const t = useTranslations("automation.schedules.dayPicker");
  const format = useFormatter();
  if (frequency !== "weekly" && frequency !== "monthly") {
    return null;
  }

  if (frequency === "weekly") {
    const selectedDay = dayOfWeek ?? 1;
    return (
      <div className="space-y-2">
        <Label className="text-muted-foreground text-xs">
          {t("dayOfWeek")}
        </Label>
        <div className="flex flex-wrap gap-2">
          {DAYS_OF_WEEK.map((day) => {
            const isActive = day === selectedDay;
            return (
              <button
                aria-pressed={isActive}
                className={cn(
                  "h-10 min-w-12 rounded-lg border px-3 text-sm font-medium transition-colors",
                  isActive
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-background text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
                key={day}
                onClick={() => onDayOfWeekChange(day)}
                type="button"
              >
                {format.dateTime(
                  new Date(WEEKDAY_REFERENCE_SUNDAY_UTC + day * DAY_MS),
                  { weekday: "short", timeZone: "UTC" }
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const selectedMonthDay = dayOfMonth ?? 1;
  const skipNote = t(`skipNotes.${getMonthDaySkipNoteKey(selectedMonthDay)}`);
  return (
    <div className="space-y-2">
      <Label className="text-muted-foreground text-xs" htmlFor="day-of-month">
        {t("dayOfMonth")}
      </Label>
      <Select
        onValueChange={(val) => {
          if (val) {
            onDayOfMonthChange(Number.parseInt(val, 10));
          }
        }}
        value={String(selectedMonthDay)}
      >
        <SelectTrigger className="w-full sm:w-40" id="day-of-month">
          <SelectValue placeholder={t("dayPlaceholder")} />
        </SelectTrigger>
        <SelectContent>
          {DAYS_OF_MONTH.map((day) => (
            <SelectItem key={day} value={String(day)}>
              {t("dayOption", { day })}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-muted-foreground text-xs">{skipNote}</p>
    </div>
  );
}

function getMonthDaySkipNoteKey(
  day: number
): "day31" | "day30" | "day29" | "default" {
  if (day === 31) {
    return "day31";
  }
  if (day === 30) {
    return "day30";
  }
  if (day === 29) {
    return "day29";
  }
  return "default";
}
