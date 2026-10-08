"use client";

import { RepeatIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { scheduleDestinationsForContentType } from "@notra/ai/utils/schedule-destinations";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import type { DragEvent } from "react";
import { useTranslations } from "use-intl";

import { ScheduledPublicationStatus } from "@/components/content/schedule/scheduled-publication-status";
import Link from "@/components/framework/link";
import { CONTENT_CALENDAR_DRAG_MIME } from "@/constants/content-calendar";
import { useLocalDateFormat } from "@/lib/hooks/use-local-date-format";
import { useScheduleDestinationName } from "@/lib/hooks/use-schedule-destination-name";
import { cn } from "@/lib/utils";
import type {
  CalendarEntryState,
  ContentCalendarChipFaceProps,
  ContentCalendarItemChipProps,
} from "@/types/content/calendar";
import { summarizePostSchedule } from "@/utils/content-calendar";
import { OutputTypeIcon } from "@/utils/output-types";

// Each state tints the whole chip, like an event in a calendar app, and
// colors its time and the bar a chip shrinks to on phones. Published posts
// are done, so they stay quiet.
const FAILED_STYLE = {
  chip: "bg-destructive/8 hover:bg-destructive/14 ring-destructive/20",
  time: "text-destructive",
  bar: "max-sm:before:bg-destructive",
};
const STATE_STYLES: Record<
  CalendarEntryState,
  { chip: string; time: string; bar: string }
> = {
  published: {
    chip: "bg-muted/60 hover:bg-muted ring-border/60 text-muted-foreground",
    time: "text-muted-foreground",
    bar: "max-sm:before:bg-success",
  },
  scheduled: {
    chip: "bg-info/8 hover:bg-info/14 ring-info/20",
    time: "text-info",
    bar: "max-sm:before:bg-info",
  },
  publishing: {
    chip: "bg-warning/8 hover:bg-warning/14 ring-warning/20",
    time: "text-warning",
    bar: "max-sm:before:bg-warning",
  },
  failed: FAILED_STYLE,
  partial: FAILED_STYLE,
};

// Time on its own line and the title on up to two lines below it, so a
// narrow month cell still shows most of the title.
const chipBase =
  "relative flex w-full min-w-0 flex-col items-start gap-0.5 rounded-lg px-2.5 py-1.5 text-left text-xs leading-4 transition-colors duration-150 ease-out focus-visible:ring-ring/50 focus-visible:ring-2 focus-visible:outline-none";

// Phones: a cell chip shrinks to a colored bar and lets taps through to the
// day, which opens the day list with full titles.
const BAR_ON_PHONES =
  "max-sm:pointer-events-none max-sm:h-1.5 max-sm:overflow-hidden max-sm:p-0";
const HIDDEN_ON_PHONES = "max-sm:sr-only";

/** A chip's face: an icon and the time, then the title on up to two lines. */
function ChipFace({
  icon,
  time,
  title,
  inCell,
  timeClassName,
  titleClassName,
}: ContentCalendarChipFaceProps) {
  return (
    <>
      <span
        className={cn(
          "flex items-center gap-1 tabular-nums",
          timeClassName,
          inCell && HIDDEN_ON_PHONES
        )}
      >
        {icon}
        {time}
      </span>
      <span
        className={cn(
          "break-words",
          titleClassName,
          inCell && cn("line-clamp-2", HIDDEN_ON_PHONES)
        )}
      >
        {title}
      </span>
    </>
  );
}

export function ContentCalendarItemChip({
  item,
  organizationSlug,
  variant,
}: ContentCalendarItemChipProps) {
  const t = useTranslations("content.calendar");
  const formatDate = useLocalDateFormat();
  const destinationName = useScheduleDestinationName();
  const inCell = variant === "cell";
  const time = formatDate(item.at, { hour: "numeric", minute: "2-digit" });
  const shortDate = formatDate(item.at, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  if (item.kind === "automation") {
    const label = t("chip.automation", { name: item.trigger.name, time });
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <Link
              aria-label={label}
              className={cn(
                chipBase,
                "text-muted-foreground hover:bg-muted hover:text-foreground border-border border border-dashed",
                inCell && BAR_ON_PHONES
              )}
              href={`/${organizationSlug}/automation/schedules`}
            />
          }
        >
          <ChipFace
            icon={
              <HugeiconsIcon className="size-3 shrink-0" icon={RepeatIcon} />
            }
            inCell={inCell}
            time={time}
            title={item.trigger.name}
          />
        </TooltipTrigger>
        <TooltipContent side="right">{label}</TooltipContent>
      </Tooltip>
    );
  }

  const { entry, state } = item;
  const { socialPlatform } = scheduleDestinationsForContentType(
    entry.post.contentType
  );
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
    <Tooltip>
      <TooltipTrigger
        render={
          <Link
            aria-label={label}
            className={cn(
              chipBase,
              "ring-1 ring-inset",
              STATE_STYLES[state].chip,
              inCell &&
                cn(
                  BAR_ON_PHONES,
                  "max-sm:before:absolute max-sm:before:inset-0",
                  STATE_STYLES[state].bar
                ),
              draggable && "cursor-grab active:cursor-grabbing"
            )}
            draggable={draggable}
            href={`/${organizationSlug}/content/${entry.post.id}`}
            onDragStart={handleDragStart}
          />
        }
      >
        <ChipFace
          icon={
            <OutputTypeIcon
              className="size-3 shrink-0"
              outputType={entry.post.contentType}
            />
          }
          inCell={inCell}
          time={time}
          timeClassName={cn(
            "text-[0.6875rem] font-medium",
            STATE_STYLES[state].time
          )}
          title={entry.post.title}
          titleClassName="font-medium"
        />
      </TooltipTrigger>
      <TooltipContent align="start" side="right">
        <div className="flex max-w-64 flex-col gap-1">
          <p className="leading-snug font-medium text-pretty">
            {entry.post.title}
          </p>
          <p className="text-muted-foreground">
            {t("preview.when", { date: shortDate, state: stateLabel })}
          </p>
          {/* With Notra alone the line above already says it all. */}
          {entry.kind === "scheduled" &&
          entry.schedule.publications.length > 1 ? (
            <ul className="mt-1 flex flex-col gap-1">
              {entry.schedule.publications.map((publication) => (
                <li
                  className="flex items-center justify-between gap-4"
                  key={publication.id}
                >
                  <span className="text-muted-foreground">
                    {destinationName({
                      destination: publication.destination,
                      socialPlatform,
                    })}
                  </span>
                  <ScheduledPublicationStatus status={publication.status} />
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
