"use client";

import { RepeatIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@notra/ui/components/ui/hover-card";
import { useTranslations } from "next-intl";
import Link from "next/link";
import type { DragEvent } from "react";

import { ScheduledPublicationStatusBadge } from "@/components/content/schedule/schedule-destination-status-list";
import { CONTENT_CALENDAR_DRAG_MIME } from "@/constants/content-calendar";
import { useLocalDateFormat } from "@/lib/hooks/use-local-date-format";
import { cn } from "@/lib/utils";
import type {
  CalendarEntryState,
  ContentCalendarItemChipProps,
} from "@/types/content/calendar";
import { summarizePostSchedule } from "@/utils/content-calendar";
import { OutputTypeIcon } from "@/utils/output-types";

const STATE_ACCENTS: Record<CalendarEntryState, string> = {
  published: "before:bg-success",
  scheduled: "before:bg-info",
  publishing: "before:bg-warning",
  failed: "before:bg-destructive",
  partial: "before:bg-destructive",
};

// Time on its own line and the title on up to two lines below it, so a
// narrow month cell still shows most of the title.
const chipBase =
  "relative flex w-full min-w-0 flex-col items-start rounded-md py-1 pr-1.5 pl-2.5 text-left text-xs leading-4 transition-colors duration-150 ease-out focus-visible:ring-ring/50 focus-visible:ring-2 focus-visible:outline-none";

// Phones: a cell chip shrinks to a colored bar and lets taps through to the
// day, which opens the day list with full titles.
const BAR_ON_PHONES =
  "max-sm:pointer-events-none max-sm:h-1.5 max-sm:overflow-hidden max-sm:p-0";
const HIDDEN_ON_PHONES = "max-sm:sr-only";

export function ContentCalendarItemChip({
  item,
  organizationSlug,
  variant,
}: ContentCalendarItemChipProps) {
  const t = useTranslations("content.calendar");
  const tCard = useTranslations("content.card");
  const formatDate = useLocalDateFormat();
  const inCell = variant === "cell";
  const time = formatDate(item.at, { hour: "numeric", minute: "2-digit" });
  const fullDate = formatDate(item.at, {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
  });

  if (item.kind === "automation") {
    const label = t("chip.automation", { name: item.trigger.name, time });
    return (
      <Link
        aria-label={label}
        className={cn(
          chipBase,
          "text-muted-foreground hover:bg-muted hover:text-foreground border-border border border-dashed",
          inCell && BAR_ON_PHONES
        )}
        href={`/${organizationSlug}/automation/schedules`}
        title={label}
      >
        <span
          className={cn(
            "flex items-center gap-1 tabular-nums",
            inCell && HIDDEN_ON_PHONES
          )}
        >
          <HugeiconsIcon className="size-3 shrink-0" icon={RepeatIcon} />
          {time}
        </span>
        <span
          className={cn(
            "break-words",
            inCell && cn("line-clamp-2", HIDDEN_ON_PHONES)
          )}
        >
          {item.trigger.name}
        </span>
      </Link>
    );
  }

  const { entry, state } = item;
  const draggable =
    entry.kind === "scheduled" &&
    summarizePostSchedule(entry.schedule).editable;
  const stateLabel = t(`states.${state}`);
  const label = t("chip.entry", {
    state: stateLabel,
    time,
    title: entry.post.title,
  });

  // The drop target looks the schedule up again, so the drag carries the ID.
  const handleDragStart = (event: DragEvent<HTMLAnchorElement>) => {
    if (!draggable) {
      return;
    }
    event.dataTransfer.setData(CONTENT_CALENDAR_DRAG_MIME, entry.post.id);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <HoverCard>
      <HoverCardTrigger
        render={
          <Link
            aria-label={label}
            className={cn(
              chipBase,
              "bg-muted/60 hover:bg-muted before:absolute before:inset-y-1.5 before:left-1 before:w-0.5 before:rounded-full",
              STATE_ACCENTS[state],
              state === "published" && "text-muted-foreground",
              inCell &&
                cn(BAR_ON_PHONES, "max-sm:before:inset-0 max-sm:before:w-full"),
              draggable && "cursor-grab active:cursor-grabbing"
            )}
            draggable={draggable}
            href={`/${organizationSlug}/content/${entry.post.id}`}
            onDragStart={handleDragStart}
          />
        }
      >
        <span
          className={cn(
            "text-muted-foreground flex items-center gap-1 text-[0.6875rem] tabular-nums",
            inCell && HIDDEN_ON_PHONES
          )}
        >
          <OutputTypeIcon
            className="size-3 shrink-0"
            outputType={entry.post.contentType}
          />
          {time}
        </span>
        <span
          className={cn(
            "break-words",
            inCell && cn("line-clamp-2", HIDDEN_ON_PHONES)
          )}
        >
          {entry.post.title}
        </span>
      </HoverCardTrigger>
      <HoverCardContent align="start" className="w-72 space-y-2.5" side="right">
        <div className="space-y-1">
          <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <OutputTypeIcon
              className="size-3.5 shrink-0"
              outputType={entry.post.contentType}
            />
            {tCard("type", {
              type: entry.post.contentType,
              fallback: entry.post.contentType,
            })}
          </p>
          <p className="text-sm leading-snug font-medium text-pretty">
            {entry.post.title}
          </p>
          <p className="text-muted-foreground text-xs">
            {t("preview.when", { date: fullDate, state: stateLabel })}
          </p>
        </div>
        {entry.kind === "scheduled" ? (
          <ul className="divide-border divide-y border-t">
            {entry.schedule.publications.map((publication) => (
              <li
                className="flex items-center justify-between gap-3 py-1.5 text-xs"
                key={publication.id}
              >
                <span>
                  {t(`schedule.destinations.${publication.destination}`)}
                </span>
                <ScheduledPublicationStatusBadge status={publication.status} />
              </li>
            ))}
          </ul>
        ) : null}
        {draggable ? (
          <p className="text-muted-foreground text-xs">
            {t("preview.dragHint")}
          </p>
        ) : null}
      </HoverCardContent>
    </HoverCard>
  );
}
