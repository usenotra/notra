"use client";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@notra/ui/components/ui/popover";
import { isToday, startOfDay } from "date-fns";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { ContentCalendarItemChip } from "@/components/content/calendar/content-calendar-item-chip";
import {
  CONTENT_CALENDAR_DRAG_MIME,
  CONTENT_CALENDAR_MONTH_CELL_LIMIT,
} from "@/constants/content-calendar";
import { useLocalDateFormat } from "@/lib/hooks/use-local-date-format";
import { cn } from "@/lib/utils";
import type { ContentCalendarDayProps } from "@/types/content/calendar";

/**
 * One month cell. The day number opens a popover with every entry of the
 * day at full length; on phones the whole cell does, since chips shrink to
 * bars there.
 */
export function ContentCalendarDay({
  day,
  items,
  outside,
  organizationSlug,
  onDropPost,
}: ContentCalendarDayProps) {
  const t = useTranslations("content.calendar");
  const formatDate = useLocalDateFormat();
  const [isDropTarget, setIsDropTarget] = useState(false);
  const past = day < startOfDay(new Date());
  const today = isToday(day);
  const visible = items.slice(0, CONTENT_CALENDAR_MONTH_CELL_LIMIT);
  const hidden = items.length - visible.length;
  const dayLabel = formatDate(day, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    // oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- Drop target for pointer drags only; keyboard users schedule from the drafts list or the post's dialog.
    <div
      aria-label={dayLabel}
      className={cn(
        "relative flex h-full min-h-16 min-w-0 flex-col gap-1 p-2 transition-colors duration-150 ease-out sm:min-h-28",
        outside && "bg-muted/30",
        isDropTarget && "bg-info/10 ring-info/40 ring-2 ring-inset"
      )}
      onDragLeave={() => setIsDropTarget(false)}
      onDragOver={(event) => {
        if (
          past ||
          !event.dataTransfer.types.includes(CONTENT_CALENDAR_DRAG_MIME)
        ) {
          return;
        }
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        setIsDropTarget(true);
      }}
      onDrop={(event) => {
        setIsDropTarget(false);
        const postId = event.dataTransfer.getData(CONTENT_CALENDAR_DRAG_MIME);
        if (postId && !past) {
          event.preventDefault();
          onDropPost(postId, day);
        }
      }}
      role="group"
    >
      <Popover>
        <PopoverTrigger
          aria-label={t("day.open", { date: dayLabel })}
          className={cn(
            "hover:bg-muted focus-visible:ring-ring/50 inline-flex size-6 items-center justify-center rounded-md text-xs tabular-nums transition-colors duration-150 ease-out focus-visible:ring-2 focus-visible:outline-none",
            "max-sm:after:absolute max-sm:after:inset-0",
            outside || past ? "text-muted-foreground" : "text-foreground",
            today && "bg-primary text-primary-foreground hover:bg-primary/90"
          )}
        >
          {day.getDate()}
        </PopoverTrigger>
        <PopoverContent align="start" className="w-72 gap-2">
          <p className="text-sm font-medium">{dayLabel}</p>
          {items.length === 0 ? (
            <p className="text-muted-foreground text-xs">{t("day.empty")}</p>
          ) : (
            <div className="flex flex-col gap-1">
              {items.map((item) => (
                <ContentCalendarItemChip
                  item={item}
                  key={item.key}
                  organizationSlug={organizationSlug}
                  variant="list"
                />
              ))}
            </div>
          )}
        </PopoverContent>
      </Popover>
      {visible.map((item) => (
        <ContentCalendarItemChip
          item={item}
          key={item.key}
          organizationSlug={organizationSlug}
          variant="cell"
        />
      ))}
      {hidden > 0 ? (
        <span className="text-muted-foreground px-1 text-xs max-sm:px-0 max-sm:text-[0.625rem]">
          {t("more", { count: hidden })}
        </span>
      ) : null}
    </div>
  );
}
