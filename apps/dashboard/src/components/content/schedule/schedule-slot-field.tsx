"use client";

import { Calendar03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Input } from "@notra/ui/components/ui/input";
import { Label } from "@notra/ui/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@notra/ui/components/ui/popover";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";

import { Button } from "@/components/button";
import { Calendar } from "@/components/calendar";
import { useLocalDateFormat } from "@/lib/hooks/use-local-date-format";
import type { ScheduleSlotFieldProps } from "@/types/content/schedule";

/** The "When" section of the schedule dialog: a day and a local time. */
export function ScheduleSlotField({
  date,
  earliestDate,
  time,
  inPast,
  timeZone,
  onDateChange,
  onTimeChange,
}: ScheduleSlotFieldProps) {
  const t = useTranslations("content.calendar.schedule");
  const formatDate = useLocalDateFormat();
  const dateId = useId();
  const timeId = useId();
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-medium">{t("when")}</h3>
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex-1 space-y-2">
          <Label className="text-muted-foreground text-xs" htmlFor={dateId}>
            {t("date")}
          </Label>
          <Popover onOpenChange={setDatePickerOpen} open={datePickerOpen}>
            <PopoverTrigger
              render={
                <Button
                  className="w-full justify-start gap-2 font-normal"
                  id={dateId}
                  type="button"
                  variant="outline"
                />
              }
            >
              <HugeiconsIcon
                className="text-muted-foreground size-4"
                icon={Calendar03Icon}
              />
              {date ? (
                formatDate(date, {
                  weekday: "short",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })
              ) : (
                <span className="text-muted-foreground">{t("pickDate")}</span>
              )}
            </PopoverTrigger>
            <PopoverContent
              align="start"
              className="w-auto overflow-hidden p-0"
              initialFocus={false}
            >
              <Calendar
                defaultMonth={date}
                disabled={{ before: earliestDate }}
                mode="single"
                onSelect={(next) => {
                  onDateChange(next);
                  setDatePickerOpen(false);
                }}
                selected={date}
                weekStartsOn={1}
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-2">
          <Label className="text-muted-foreground text-xs" htmlFor={timeId}>
            {t("time")}
          </Label>
          <Input
            className="bg-background w-full appearance-none tabular-nums sm:w-32 [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
            id={timeId}
            onChange={(event) => onTimeChange(event.target.value)}
            required
            type="time"
            value={time}
          />
        </div>
      </div>
      <p
        className={
          inPast ? "text-destructive text-xs" : "text-muted-foreground text-xs"
        }
        role={inPast ? "alert" : undefined}
      >
        {inPast ? t("inPast") : t("timeZoneHint", { timeZone })}
      </p>
    </section>
  );
}
