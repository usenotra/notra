"use client";

import { Skeleton } from "@notra/ui/components/ui/skeleton";

import { ScanActivityStatus } from "@/components/geo/scan-activity-status";
import { ScanRunDetail } from "@/components/geo/scan-run-detail";
import { GeoTableSkeleton } from "@/components/geo/skeleton-parts";
import { useIsGeoScanning } from "@/lib/hooks/use-geo";
import { useGeoScanRuns } from "@/lib/hooks/use-geo-scan-history";
import type { GeoScanActivityProps } from "@/types/geo-scan-activity";

const SCAN_SKELETON_ROWS = 3;

/** The latest scan as a regular section: status header plus its answers table. */
export function ScanActivity({ organizationId }: GeoScanActivityProps) {
  const isScanning = useIsGeoScanning(organizationId);
  const latest = useGeoScanRuns(organizationId);
  const newest = latest.data?.runs[0];

  if (latest.isPending) {
    return (
      <section
        aria-hidden="true"
        className="space-y-3"
        data-product-tour="geo-scan"
      >
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-64 max-w-full" />
        </div>
        <GeoTableSkeleton rows={SCAN_SKELETON_ROWS} />
      </section>
    );
  }

  if (!newest && !isScanning) {
    return null;
  }

  return (
    <section
      aria-label="Scans"
      className="min-w-0 space-y-3"
      data-product-tour="geo-scan"
    >
      <ScanActivityStatus run={newest} />
      {newest ? (
        <ScanRunDetail
          key={newest.id}
          organizationId={organizationId}
          run={newest}
        />
      ) : (
        <GeoTableSkeleton rows={SCAN_SKELETON_ROWS} />
      )}
    </section>
  );
}
