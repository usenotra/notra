"use client";

import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { useState } from "react";

import { ScanActivityStatus } from "@/components/geo/scan-activity-status";
import { ScanRunDetail } from "@/components/geo/scan-run-detail";
import { GeoTableSkeleton } from "@/components/geo/skeleton-parts";
import { useIsGeoScanning } from "@/lib/hooks/use-geo";
import { useGeoScanRuns } from "@/lib/hooks/use-geo-scan-history";
import type { GeoScanActivityProps } from "@/types/geo-scan-activity";

const SCAN_SKELETON_ROWS = 3;

/** Recent scans as a regular section: status header plus the selected run. */
export function ScanActivity({ organizationId }: GeoScanActivityProps) {
  const isScanning = useIsGeoScanning(organizationId);
  const history = useGeoScanRuns(organizationId);
  const [runId, setRunId] = useState<string | null>(null);
  const runs = history.data?.runs ?? [];
  const selected = runs.find((run) => run.id === runId) ?? runs[0];

  if (history.isPending) {
    return (
      <section aria-hidden="true" className="space-y-3">
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-64 max-w-full" />
        </div>
        <GeoTableSkeleton rows={SCAN_SKELETON_ROWS} />
      </section>
    );
  }

  if (!selected && !isScanning) {
    return null;
  }

  return (
    <section aria-label="Scans" className="min-w-0 space-y-3">
      <ScanActivityStatus onSelectRun={setRunId} run={selected} runs={runs} />
      {selected ? (
        <ScanRunDetail
          key={selected.id}
          organizationId={organizationId}
          run={selected}
        />
      ) : (
        <GeoTableSkeleton rows={SCAN_SKELETON_ROWS} />
      )}
    </section>
  );
}
