"use client";

import { isSameMonth } from "date-fns";

import { ContentCalendarDay } from "@/components/content/calendar/content-calendar-day";
import { useLocalDateFormat } from "@/lib/hooks/use-local-date-format";
import type { ContentCalendarGridProps } from "@/types/content/calendar";
import { calendarDayKey } from "@/utils/content-calendar";

export function ContentCalendarGrid({
  days,
  month,
  itemsByDay,
  organizationSlug,
  onDropPost,
}: ContentCalendarGridProps) {
  const formatDate = useLocalDateFormat();

  // Dualtone, like the content tables: weekdays sit on the shell, the
  // days are the lifted body overlapping it.
  return (
    <div>
      <div className="border-shell-border bg-shell overflow-hidden rounded-t-2xl border border-b-0 pb-5">
        <div className="grid grid-cols-7">
          {days.slice(0, 7).map((day) => (
            <div
              className="text-muted-foreground px-3 py-2.5 text-sm font-medium"
              key={day.toISOString()}
            >
              {formatDate(day, { weekday: "short" })}
            </div>
          ))}
        </div>
      </div>
      <div className="border-border bg-background shadow-lift relative -mt-5 overflow-hidden rounded-2xl border">
        <div className="bg-border grid grid-cols-7 gap-px">
          {days.map((day) => (
            <div className="bg-background" key={calendarDayKey(day)}>
              <ContentCalendarDay
                day={day}
                items={itemsByDay.get(calendarDayKey(day)) ?? []}
                onDropPost={onDropPost}
                organizationSlug={organizationSlug}
                outside={!isSameMonth(day, month)}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
