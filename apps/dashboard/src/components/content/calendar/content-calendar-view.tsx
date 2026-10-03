"use client";

import { ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useQuery } from "@tanstack/react-query";
import { isSameDay, startOfDay } from "date-fns";
import { useTranslations } from "next-intl";
import { useQueryState } from "nuqs";
import { useMemo } from "react";
import { toast } from "sonner";

import { Button } from "@/components/button";
import { ContentCalendarGrid } from "@/components/content/calendar/content-calendar-grid";
import { EmptyState } from "@/components/empty-state";
import { SCHEDULE_SLOT_DATE_FORMAT } from "@/constants/content-calendar";
import {
  useContentCalendar,
  useSchedulePost,
} from "@/lib/hooks/use-content-calendar";
import { useLocalDateFormat } from "@/lib/hooks/use-local-date-format";
import { dashboardOrpc } from "@/lib/orpc/query";
import { cn } from "@/lib/utils";
import type {
  CalendarDropHandler,
  ContentCalendarViewProps,
} from "@/types/content/calendar";
import {
  calendarDayKey,
  calendarEntryItems,
  combineDateAndTime,
  findMovableEntry,
  groupCalendarItemsByDay,
  parseCalendarDayKey,
  projectAutomationRuns,
  scheduleDestinationsOf,
  shiftCalendarMonth,
  summarizePostSchedule,
  toTimeInputValue,
} from "@/utils/content-calendar";
import { getLocalTimezone } from "@/utils/schedule-summary";

export function ContentCalendarView({
  organizationId,
  organizationSlug,
  toolbarEnd,
}: ContentCalendarViewProps) {
  const t = useTranslations("content.calendar");
  const tCommon = useTranslations("common.actions");
  const formatDate = useLocalDateFormat();
  const [anchorKey, setAnchorKey] = useQueryState("date", {
    clearOnDefault: true,
  });
  const anchor = useMemo(
    () => parseCalendarDayKey(anchorKey) ?? startOfDay(new Date()),
    [anchorKey]
  );

  const { days, range, query } = useContentCalendar(organizationId, anchor);
  const { data, isPending, isPlaceholderData, isError, refetch } = query;
  const isLoading = isPending || isPlaceholderData;
  const { data: automation } = useQuery(
    dashboardOrpc.automation.schedules.list.queryOptions({
      input: { organizationId },
      enabled: !!organizationId,
      staleTime: 5 * 60 * 1000,
    })
  );
  const reschedule = useSchedulePost(organizationId);

  const itemsByDay = useMemo(
    () =>
      groupCalendarItemsByDay([
        ...calendarEntryItems(data?.entries ?? []),
        ...projectAutomationRuns(automation?.triggers ?? [], range),
      ]),
    [data?.entries, automation?.triggers, range]
  );

  const setAnchor = (date: Date) => {
    const key = calendarDayKey(date);
    void setAnchorKey(key === calendarDayKey(new Date()) ? null : key);
  };

  const handleDropPost: CalendarDropHandler = (postId, day) => {
    const entry = findMovableEntry(data?.entries ?? [], postId);
    if (!entry) {
      return;
    }
    const { post, schedule } = entry;
    const previous = new Date(schedule.scheduledAt);
    if (isSameDay(previous, day)) {
      return;
    }
    // Moving keeps the time of day and every destination.
    const scheduledAt = combineDateAndTime(day, toTimeInputValue(previous));
    if (scheduledAt.getTime() < Date.now()) {
      toast.error(t("toasts.moveIntoPast"));
      return;
    }
    reschedule.mutate(
      {
        contentId: post.id,
        scheduledAt,
        // The new wall-clock time was picked in this browser's zone.
        timeZone: getLocalTimezone(),
        destinations: scheduleDestinationsOf(schedule),
        expectedScheduledIds: summarizePostSchedule(schedule).scheduledIds,
      },
      {
        onSuccess: () => {
          toast.success(
            t("toasts.moved", {
              title: post.title,
              date: formatDate(scheduledAt, SCHEDULE_SLOT_DATE_FORMAT),
            })
          );
        },
      }
    );
  };

  const heading = formatDate(anchor, { month: "long", year: "numeric" });

  return (
    <div className="space-y-3">
      <div className="flex min-h-8 flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <Button
            aria-label={t("previous")}
            onClick={() => setAnchor(shiftCalendarMonth(anchor, -1))}
            size="icon-sm"
            variant="ghost"
          >
            <HugeiconsIcon className="size-4" icon={ArrowLeft01Icon} />
          </Button>
          <Button
            aria-label={t("next")}
            onClick={() => setAnchor(shiftCalendarMonth(anchor, 1))}
            size="icon-sm"
            variant="ghost"
          >
            <HugeiconsIcon className="size-4" icon={ArrowRight01Icon} />
          </Button>
          <h2 aria-live="polite" className="ml-1 text-sm font-medium">
            {heading}
          </h2>
          {anchorKey ? (
            <Button
              onClick={() => {
                void setAnchorKey(null);
              }}
              size="sm"
              variant="ghost"
            >
              {t("today")}
            </Button>
          ) : null}
        </div>
        {toolbarEnd}
      </div>

      {isError ? (
        <EmptyState
          action={
            <Button
              onClick={() => {
                void refetch();
              }}
              variant="outline"
            >
              {tCommon("tryAgain")}
            </Button>
          }
          description={t("loadFailedDescription")}
          title={t("loadFailedTitle")}
        />
      ) : (
        <div
          aria-busy={isLoading}
          className={cn(
            "min-w-0 transition-opacity duration-150 ease-out",
            isLoading && "opacity-60"
          )}
        >
          <ContentCalendarGrid
            days={days}
            itemsByDay={itemsByDay}
            month={anchor}
            onDropPost={handleDropPost}
            organizationSlug={organizationSlug}
          />
        </div>
      )}
    </div>
  );
}
