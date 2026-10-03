"use client";

import {
  GEO_LIVE_SCAN_FALLBACK_INTERVAL_MS,
  GEO_SCAN_POLL_INTERVAL_MS,
} from "@notra/geo-core/constants/geo";
import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useCallback } from "react";
import { useTranslations } from "use-intl";

import { useGeoLive } from "@/components/providers/geo-live-provider";
import { useGeoProjectScope } from "@/components/providers/geo-project-provider";
import { useIsGeoScanning } from "@/lib/hooks/use-geo";
import { dashboardOrpc } from "@/lib/orpc/query";

/**
 * One scan's answers. Omit `scanId` to follow the project's newest scan, which
 * saves the Answers tab a round trip through the run list.
 */
export function useGeoScanRun(
  organizationId: string,
  scanId: string | undefined,
  offset: number,
  engine?: string,
  pendingOffset = 0
) {
  const tToast = useTranslations("geo.toasts");
  const { projectId } = useGeoProjectScope();
  const isScanning = useIsGeoScanning(organizationId);
  const pollInterval = useGeoLive()
    ? GEO_LIVE_SCAN_FALLBACK_INTERVAL_MS
    : GEO_SCAN_POLL_INTERVAL_MS;
  const followsLatest = scanId === undefined;
  return useQuery({
    ...dashboardOrpc.geo.scanRun.queryOptions({
      input: {
        organizationId,
        projectId,
        scanId,
        offset,
        engine,
        pendingOffset,
      },
    }),
    enabled: !!organizationId,
    placeholderData: keepPreviousData,
    staleTime: GEO_SCAN_POLL_INTERVAL_MS,
    refetchInterval: (query) =>
      query.state.data?.status === "running" || (followsLatest && isScanning)
        ? pollInterval
        : false,
    meta: { errorMessage: tToast("loadScanResultsFailed") },
  });
}

/** Warms the Answers tab's first page before the tab opens. */
export function usePrefetchGeoLatestScanRun(organizationId: string) {
  const queryClient = useQueryClient();
  const { projectId } = useGeoProjectScope();
  return useCallback(() => {
    if (!organizationId) {
      return;
    }
    void queryClient.prefetchQuery({
      ...dashboardOrpc.geo.scanRun.queryOptions({
        input: {
          organizationId,
          projectId,
          scanId: undefined,
          offset: 0,
          engine: undefined,
          pendingOffset: 0,
        },
      }),
      staleTime: GEO_SCAN_POLL_INTERVAL_MS,
    });
  }, [organizationId, projectId, queryClient]);
}
