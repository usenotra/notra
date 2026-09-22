"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { useGeoProjectScope } from "@/components/providers/geo-project-provider";
import { useIsGeoScanning } from "@/lib/hooks/use-geo";
import { dashboardOrpc } from "@/lib/orpc/query";
import { geoScanRefetchInterval } from "@/utils/geo-scan-activity";

export function useGeoScanRuns(
  organizationId: string,
  offset = 0,
  enabled = true
) {
  const { projectId } = useGeoProjectScope();
  const isScanning = useIsGeoScanning(organizationId);
  return useQuery({
    ...dashboardOrpc.geo.scanRuns.queryOptions({
      input: { organizationId, projectId, offset },
    }),
    enabled: !!organizationId && enabled,
    staleTime: 0,
    refetchInterval: (query) =>
      geoScanRefetchInterval(
        isScanning,
        query.state.data?.runs.some((run) => run.status === "running")
          ? "running"
          : undefined
      ),
    refetchIntervalInBackground: false,
    meta: { errorMessage: "Failed to load recent scans" },
  });
}

export function useGeoScanRun(
  organizationId: string,
  scanId: string,
  offset: number,
  engine?: string,
  pendingOffset = 0,
  running = false
) {
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
    staleTime: 0,
    refetchInterval: (query) =>
      geoScanRefetchInterval(running, query.state.data?.status),
    refetchIntervalInBackground: false,
    meta: { errorMessage: "Failed to load scan results" },
  });
}
