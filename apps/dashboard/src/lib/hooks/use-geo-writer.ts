"use client";

import { GEO_WRITER_BRIEF_POLL_INTERVAL_MS } from "@notra/geo-core/constants/geo";
import type {
  GeoContentBriefDetail,
  GeoContentBriefsResponse,
  GeoContentGapsResponse,
  GeoWriterPlanInput,
} from "@notra/geo-core/types/geo";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import { toast } from "sonner";

import { useGeoProjectScope } from "@/components/providers/geo-project-provider";
import { toErrorMessage } from "@/utils/error-message";
import { withoutPromptGap, withRestoredPromptGap } from "@/utils/geo-gaps";
import { getConflictRevision, isNotFoundError } from "@/utils/orpc-errors";

import { dashboardOrpc } from "../orpc/query";

export function useGeoWriterGaps(organizationId: string) {
  const { projectId } = useGeoProjectScope();
  return useQuery<GeoContentGapsResponse>({
    ...dashboardOrpc.geo.writerGaps.queryOptions({
      input: { organizationId, projectId },
    }),
    enabled: !!organizationId,
    meta: { errorMessage: "Failed to load content gaps" },
  });
}

export function useGeoWriterBriefs(organizationId: string) {
  const { projectId } = useGeoProjectScope();
  return useQuery<GeoContentBriefsResponse>({
    ...dashboardOrpc.geo.writerBriefsList.queryOptions({
      input: { organizationId, projectId },
    }),
    enabled: !!organizationId,
    meta: { errorMessage: "Failed to load briefs" },
  });
}

export function useGeoWriterBrief(
  organizationId: string,
  briefId: string | null,
  briefProjectId?: string
) {
  const { projectId: scopeProjectId } = useGeoProjectScope();
  const projectId = briefProjectId ?? scopeProjectId;
  return useQuery<GeoContentBriefDetail>({
    ...dashboardOrpc.geo.writerBrief.queryOptions({
      input: { organizationId, projectId, briefId: briefId ?? "" },
    }),
    enabled: !!organizationId && !!briefId,
    retry: (failureCount, error) => !isNotFoundError(error) && failureCount < 1,
    // Poll while the writer is running. New runs skip "approved" (draft/failed
    // go straight to "writing"), but legacy rows can still sit in "approved".
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "writing" || status === "approved"
        ? GEO_WRITER_BRIEF_POLL_INTERVAL_MS
        : false;
    },
    refetchIntervalInBackground: false,
    meta: { errorMessage: "Failed to load the brief" },
  });
}

function useInvalidateWriterQueries(organizationId: string) {
  const { projectId } = useGeoProjectScope();
  const queryClient = useQueryClient();
  return async () => {
    await queryClient.invalidateQueries({
      queryKey: dashboardOrpc.geo.writerBriefsList.queryKey({
        input: { organizationId, projectId },
      }),
    });
    await queryClient.invalidateQueries({
      queryKey: dashboardOrpc.geo.writerGaps.queryKey({
        input: { organizationId, projectId },
      }),
    });
  };
}

export function useGeoPromptGapIgnore(organizationId: string) {
  const { projectId } = useGeoProjectScope();
  const queryClient = useQueryClient();
  const gapsQueryKey = dashboardOrpc.geo.writerGaps.queryKey({
    input: { organizationId, projectId },
  });
  return useMutation({
    mutationFn: (input: { promptId: string; ignored: boolean }) =>
      dashboardOrpc.geo.writerGapIgnore.call({
        ...input,
        organizationId,
        projectId,
      }),
    onMutate: async ({ promptId, ignored }) => {
      if (!ignored) {
        return { removed: undefined };
      }
      await queryClient.cancelQueries({ queryKey: gapsQueryKey });
      const current =
        queryClient.getQueryData<GeoContentGapsResponse>(gapsQueryKey);
      const removed = current?.promptGaps.find((row) => row.id === promptId);
      if (current && removed) {
        queryClient.setQueryData<GeoContentGapsResponse>(
          gapsQueryKey,
          withoutPromptGap(current, promptId)
        );
      }
      return { removed };
    },
    onError: (error, _input, context) => {
      // Restore only this row so concurrent ignores of other rows stay removed.
      const removed = context?.removed;
      if (removed) {
        queryClient.setQueryData<GeoContentGapsResponse>(
          gapsQueryKey,
          (current) => current && withRestoredPromptGap(current, removed)
        );
      }
      toast.error(toErrorMessage(error, "Failed to update the gap"));
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: gapsQueryKey });
    },
  });
}

export function useGeoWriterPlan(organizationId: string) {
  const { projectId } = useGeoProjectScope();
  const invalidate = useInvalidateWriterQueries(organizationId);
  return useMutation({
    mutationFn: (input: GeoWriterPlanInput) =>
      dashboardOrpc.geo.writerPlan.call({
        ...input,
        organizationId,
        projectId,
      }),
    onSuccess: async () => {
      await invalidate();
    },
    onError: (error) => {
      toast.error(toErrorMessage(error, "Failed to plan the article"));
    },
  });
}

export function useGeoWriterStart(organizationId: string) {
  const { projectId } = useGeoProjectScope();
  const queryClient = useQueryClient();
  const invalidate = useInvalidateWriterQueries(organizationId);
  return useMutation({
    mutationFn: (briefId: string) =>
      dashboardOrpc.geo.writerStart.call({
        organizationId,
        projectId,
        briefId,
      }),
    onSuccess: async (_result, briefId) => {
      await Promise.all([
        invalidate(),
        queryClient.invalidateQueries({
          queryKey: dashboardOrpc.geo.writerBrief.queryKey({
            input: { organizationId, projectId, briefId },
          }),
        }),
      ]);
    },
    onError: (error) => {
      toast.error(toErrorMessage(error, "Failed to start writing"));
    },
  });
}

export function useGeoWriterUpdate(organizationId: string, contentId: string) {
  const { projectId } = useGeoProjectScope();
  const queryClient = useQueryClient();
  const invalidate = useInvalidateWriterQueries(organizationId);
  const latestRevisionByBrief = useRef(new Map<string, string>());
  return useMutation({
    scope: { id: `geo-writer-update:${organizationId}:${projectId}` },
    mutationFn: async (input: {
      briefId: string;
      expectedUpdatedAt: string;
      markdown: string;
      workingTitle?: string;
    }) => {
      try {
        const result = await dashboardOrpc.geo.writerUpdate.call({
          ...input,
          expectedUpdatedAt:
            latestRevisionByBrief.current.get(input.briefId) ??
            input.expectedUpdatedAt,
          organizationId,
          projectId,
        });
        latestRevisionByBrief.current.set(input.briefId, result.updatedAt);
        return result;
      } catch (error) {
        if (getConflictRevision(error).isConflict) {
          latestRevisionByBrief.current.delete(input.briefId);
        }
        throw error;
      }
    },
    onSuccess: async (result) => {
      await Promise.all([
        invalidate(),
        queryClient.invalidateQueries({
          queryKey: dashboardOrpc.geo.writerBrief.queryKey({
            input: {
              organizationId,
              projectId,
              briefId: result.id,
            },
          }),
        }),
      ]);
    },
    onError: (error, input) => {
      if (getConflictRevision(error).isConflict) {
        void Promise.all([
          queryClient.invalidateQueries({
            queryKey: dashboardOrpc.geo.writerBrief.queryKey({
              input: {
                organizationId,
                projectId,
                briefId: input.briefId,
              },
            }),
          }),
          queryClient.invalidateQueries({
            queryKey: dashboardOrpc.content.get.queryKey({
              input: { organizationId, contentId },
            }),
          }),
        ]);
      }
      toast.error(toErrorMessage(error, "Failed to update the plan"));
    },
  });
}
