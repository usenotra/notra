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
import { getConflictRevision } from "@/utils/orpc-errors";

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
  /**
   * Overrides the ambient GEO project scope. Content pages live outside the
   * GEO scope provider, so they pass the project the brief belongs to.
   */
  projectIdOverride?: string
) {
  const { projectId: scopedProjectId } = useGeoProjectScope();
  const projectId = projectIdOverride ?? scopedProjectId;
  return useQuery<GeoContentBriefDetail>({
    ...dashboardOrpc.geo.writerBrief.queryOptions({
      input: { organizationId, projectId, briefId: briefId ?? "" },
    }),
    enabled: !!organizationId && !!briefId,
    // Only "writing" is polled: `approveAndStartGeoWriter` claims the brief
    // straight from "draft"/"failed" to "writing" in the same update that
    // starts the run, so a brief never sits in "approved" waiting for the
    // workflow. The status is kept in the UI's busy set for legacy rows only.
    refetchInterval: (query) =>
      query.state.data?.status === "writing"
        ? GEO_WRITER_BRIEF_POLL_INTERVAL_MS
        : false,
    refetchIntervalInBackground: false,
    meta: { errorMessage: "Failed to load the brief" },
  });
}

function useInvalidateWriterQueries(
  organizationId: string,
  projectId?: string
) {
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

export function useGeoWriterPlan(organizationId: string) {
  const { projectId } = useGeoProjectScope();
  const invalidate = useInvalidateWriterQueries(organizationId, projectId);
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

export function useGeoWriterStart(
  organizationId: string,
  /** See `useGeoWriterBrief`: content pages scope by the article's project. */
  projectIdOverride?: string
) {
  const { projectId: scopedProjectId } = useGeoProjectScope();
  const projectId = projectIdOverride ?? scopedProjectId;
  const queryClient = useQueryClient();
  const invalidate = useInvalidateWriterQueries(organizationId, projectId);
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

export function useGeoWriterUpdate(
  organizationId: string,
  contentId: string,
  /** See `useGeoWriterBrief`: content pages scope by the article's project. */
  projectIdOverride?: string
) {
  const { projectId: scopedProjectId } = useGeoProjectScope();
  const projectId = projectIdOverride ?? scopedProjectId;
  const queryClient = useQueryClient();
  const invalidate = useInvalidateWriterQueries(organizationId, projectId);
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
