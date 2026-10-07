"use client";

import type {
  ContentCalendarView,
  PostScheduleView,
} from "@notra/ai/types/scheduled-publications";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";

import {
  CONTENT_CALENDAR_POLL_MS,
  CONTENT_CALENDAR_PREFETCH_STALE_MS,
  POST_SCHEDULE_POLL_MS,
} from "@/constants/content-calendar";
import { dashboardOrpc } from "@/lib/orpc/query";
import type { ContentCalendarRange } from "@/types/content/calendar";
import type {
  PostScheduleResponse,
  SchedulePostMutationInput,
} from "@/types/content/schedule";
import {
  getCalendarDays,
  getCalendarRange,
  schedulePollTier,
  shiftCalendarMonth,
} from "@/utils/content-calendar";
import { toErrorMessage } from "@/utils/error-message";

import { useActiveProject } from "./use-active-project";
import { useScopedPreviousData } from "./use-scoped-previous-data";

function contentCalendarListOptions(
  organizationId: string,
  projectId: string | undefined,
  range: ContentCalendarRange
) {
  return dashboardOrpc.contentCalendar.list.queryOptions({
    input: {
      organizationId,
      projectId,
      from: range.from.toISOString(),
      to: range.to.toISOString(),
    },
  });
}

/** The month grid around `anchor`, its entries, and warm neighbouring months. */
export function useContentCalendar(organizationId: string, anchor: Date) {
  const queryClient = useQueryClient();
  const { projectId, isResolved } = useActiveProject();
  const scopedProjectId = projectId ?? undefined;
  const days = useMemo(() => getCalendarDays(anchor), [anchor]);
  const range = useMemo(() => getCalendarRange(days), [days]);
  const enabled = Boolean(organizationId) && isResolved;
  const placeholderData = useScopedPreviousData<ContentCalendarView>(
    `${organizationId}:${scopedProjectId ?? ""}`
  );

  const query = useQuery<ContentCalendarView>({
    ...contentCalendarListOptions(organizationId, scopedProjectId, range),
    enabled,
    placeholderData,
    refetchInterval: (current) => {
      const tiers = (current.state.data?.entries ?? []).map((entry) =>
        entry.kind === "scheduled" ? schedulePollTier(entry.schedule) : null
      );
      if (tiers.includes("active")) {
        return CONTENT_CALENDAR_POLL_MS.active;
      }
      return tiers.includes("idle") ? CONTENT_CALENDAR_POLL_MS.idle : false;
    },
  });

  // Warm the neighbouring months so paging is instant.
  useEffect(() => {
    if (!enabled) {
      return;
    }
    for (const direction of [-1, 1] as const) {
      const neighbour = getCalendarRange(
        getCalendarDays(shiftCalendarMonth(anchor, direction))
      );
      void queryClient.prefetchQuery({
        ...contentCalendarListOptions(
          organizationId,
          scopedProjectId,
          neighbour
        ),
        staleTime: CONTENT_CALENDAR_PREFETCH_STALE_MS,
      });
    }
  }, [anchor, enabled, organizationId, scopedProjectId, queryClient]);

  return { days, range, query };
}

export function usePostSchedule(organizationId: string, contentId: string) {
  const queryClient = useQueryClient();
  const query = useQuery<PostScheduleResponse>({
    ...dashboardOrpc.contentCalendar.get.queryOptions({
      input: { organizationId, contentId },
    }),
    enabled: !!organizationId && !!contentId,
    refetchInterval: (current) => {
      const tier = schedulePollTier(current.state.data?.schedule);
      return tier ? POST_SCHEDULE_POLL_MS[tier] : false;
    },
  });

  // A destination that just went out changed the post (status, PR link) on
  // the server; refresh what the page shows about it. Null until the first
  // response, so loading a schedule that already went out refreshes nothing.
  const publishedIds = query.data
    ? (query.data.schedule?.publications
        .filter((publication) => publication.status === "published")
        .map((publication) => publication.id)
        .join(",") ?? "")
    : null;
  const seenPublishedIds = useRef<string | null>(null);
  useEffect(() => {
    if (publishedIds === null) {
      return;
    }
    const previous = seenPublishedIds.current;
    seenPublishedIds.current = publishedIds;
    if (previous === null || previous === publishedIds || !publishedIds) {
      return;
    }
    // Status, PR link, recent-posts badges and collection counts all read
    // from the content queries.
    queryClient.invalidateQueries({ queryKey: dashboardOrpc.content.key() });
    queryClient.invalidateQueries({
      queryKey: dashboardOrpc.contentCalendar.list.key(),
    });
  }, [publishedIds, queryClient]);

  return query;
}

/**
 * Writes a post's fresh schedule into the cache and invalidates what depends
 * on it: every calendar month and the post itself.
 */
function useScheduleInvalidation(organizationId: string) {
  const queryClient = useQueryClient();
  return (contentId: string, schedule: PostScheduleView | null) => {
    queryClient.setQueryData<PostScheduleResponse>(
      dashboardOrpc.contentCalendar.get.queryKey({
        input: { organizationId, contentId },
      }),
      { schedule }
    );
    queryClient.invalidateQueries({
      queryKey: dashboardOrpc.contentCalendar.list.key(),
    });
    // "Publish now" and retries flip the post to published within seconds.
    queryClient.invalidateQueries({
      queryKey: dashboardOrpc.content.get.queryKey({
        input: { organizationId, contentId },
      }),
    });
  };
}

/**
 * Reloads a post's schedule after a rejected change. The usual cause is a
 * schedule that changed elsewhere, and until the cache catches up every new
 * attempt would send the same stale view and be rejected again.
 */
function useScheduleRefetch(organizationId: string) {
  const queryClient = useQueryClient();
  return (contentId: string) => {
    queryClient.invalidateQueries({
      queryKey: dashboardOrpc.contentCalendar.get.queryKey({
        input: { organizationId, contentId },
      }),
    });
    queryClient.invalidateQueries({
      queryKey: dashboardOrpc.contentCalendar.list.key(),
    });
  };
}

export function useSchedulePost(organizationId: string) {
  const t = useTranslations("content.calendar.toasts");
  const invalidateSchedule = useScheduleInvalidation(organizationId);
  const refetchSchedule = useScheduleRefetch(organizationId);
  return useMutation({
    mutationFn: (input: SchedulePostMutationInput) =>
      dashboardOrpc.contentCalendar.schedule.call({
        organizationId,
        contentId: input.contentId,
        scheduledAt: input.scheduledAt.toISOString(),
        timeZone: input.timeZone,
        destinations: input.destinations,
        expectedScheduledIds: input.expectedScheduledIds,
      }),
    onSuccess: (result, input) => {
      invalidateSchedule(input.contentId, result.schedule);
    },
    onError: (error, input) => {
      refetchSchedule(input.contentId);
      toast.error(toErrorMessage(error, t("scheduleFailed")));
    },
  });
}

export function useCancelPostSchedule(organizationId: string) {
  const t = useTranslations("content.calendar.toasts");
  const invalidateSchedule = useScheduleInvalidation(organizationId);
  const refetchSchedule = useScheduleRefetch(organizationId);
  return useMutation({
    mutationFn: (contentId: string) =>
      dashboardOrpc.contentCalendar.cancel.call({ organizationId, contentId }),
    onSuccess: (result, contentId) => {
      invalidateSchedule(contentId, result.schedule);
      toast.success(
        result.inProgress ? t("unscheduledPartially") : t("unscheduled")
      );
    },
    onError: (error, contentId) => {
      refetchSchedule(contentId);
      toast.error(toErrorMessage(error, t("unscheduleFailed")));
    },
  });
}

export function usePublishScheduleNow(organizationId: string) {
  const t = useTranslations("content.calendar.toasts");
  const invalidateSchedule = useScheduleInvalidation(organizationId);
  const refetchSchedule = useScheduleRefetch(organizationId);
  return useMutation({
    mutationFn: (contentId: string) =>
      dashboardOrpc.contentCalendar.publishNow.call({
        organizationId,
        contentId,
      }),
    onSuccess: (result, contentId) => {
      invalidateSchedule(contentId, result.schedule);
      toast.success(t("publishingNow"));
    },
    onError: (error, contentId) => {
      refetchSchedule(contentId);
      toast.error(toErrorMessage(error, t("publishNowFailed")));
    },
  });
}

export function useRetryScheduledPublication(organizationId: string) {
  const t = useTranslations("content.calendar.toasts");
  const invalidateSchedule = useScheduleInvalidation(organizationId);
  const refetchSchedule = useScheduleRefetch(organizationId);
  return useMutation({
    mutationFn: (input: {
      contentId: string;
      scheduledPublicationId: string;
    }) =>
      dashboardOrpc.contentCalendar.retry.call({
        organizationId,
        scheduledPublicationId: input.scheduledPublicationId,
      }),
    onSuccess: (result, input) => {
      invalidateSchedule(input.contentId, result.schedule);
      toast.success(t("retrying"));
    },
    onError: (error, input) => {
      refetchSchedule(input.contentId);
      toast.error(toErrorMessage(error, t("retryFailed")));
    },
  });
}
