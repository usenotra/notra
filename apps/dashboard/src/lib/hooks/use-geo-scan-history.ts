"use client";

import { GEO_SCAN_POLL_INTERVAL_MS } from "@notra/geo-core/constants/geo";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import { useGeoProjectScope } from "@/components/providers/geo-project-provider";
import { useIsGeoScanning } from "@/lib/hooks/use-geo";
import { dashboardOrpc } from "@/lib/orpc/query";

export function useGeoScanRuns(
  organizationId: string,
  offset = 0,
  enabled = true
) {
  const tToast = useTranslations("geo.toasts");
  const { projectId } = useGeoProjectScope();
  const isScanning = useIsGeoScanning(organizationId);
  return useQuery({
    ...dashboardOrpc.geo.scanRuns.queryOptions({
      input: { organizationId, projectId, offset },
    }),
    enabled: !!organizationId && enabled,
    refetchInterval: (query) =>
      isScanning ||
      query.state.data?.runs.some((run) => run.status === "running")
        ? GEO_SCAN_POLL_INTERVAL_MS
        : false,
    meta: { errorMessage: tToast("loadRecentScansFailed") },
  });
}

export function useGeoScanRun(
  organizationId: string,
  scanId: string,
  offset: number,
  engine?: string,
  pendingOffset = 0
) {
  const tToast = useTranslations("geo.toasts");
  const { projectId } = useGeoProjectScope();
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
    enabled: !!organizationId && !!scanId,
    placeholderData: keepPreviousData,
    staleTime: GEO_SCAN_POLL_INTERVAL_MS,
    refetchInterval: (query) =>
      query.state.data?.status === "running"
        ? GEO_SCAN_POLL_INTERVAL_MS
        : false,
    meta: { errorMessage: tToast("loadScanResultsFailed") },
  });
}
