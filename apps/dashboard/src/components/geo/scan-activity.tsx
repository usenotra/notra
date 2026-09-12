"use client";

import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useId, useState } from "react";

import { ScanActivityStatus } from "@/components/geo/scan-activity-status";
import { ScanRunDetail } from "@/components/geo/scan-run-detail";
import { useIsGeoScanning } from "@/lib/hooks/use-geo";
import { useGeoScanRuns } from "@/lib/hooks/use-geo-scan-history";
import type { GeoScanActivityProps } from "@/types/geo-scan-activity";

export function ScanActivity({ organizationId }: GeoScanActivityProps) {
  const [expanded, setExpanded] = useState(false);
  const [hasExpanded, setHasExpanded] = useState(false);
  const resultsId = useId();
  const isScanning = useIsGeoScanning(organizationId);
  const latest = useGeoScanRuns(organizationId);
  const newest = latest.data?.runs[0];

  if (!newest && !isScanning) {
    return null;
  }

  return (
    <section
      aria-label="Latest scan"
      className="bg-muted/60 min-w-0 overflow-hidden rounded-xl p-1"
    >
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={resultsId}
        onClick={() => {
          setHasExpanded(true);
          setExpanded((value) => !value);
        }}
        className="focus-visible:ring-ring hover:bg-muted/60 flex min-h-12 w-full flex-wrap items-center gap-2 rounded-lg px-3 py-2 text-left text-xs outline-none focus-visible:ring-2"
      >
        <ScanActivityStatus run={newest} />
        <HugeiconsIcon
          aria-hidden="true"
          icon={ArrowRight01Icon}
          size={14}
          className={`duration-normal ml-auto shrink-0 transition-transform ease-out motion-reduce:transition-none ${expanded ? "rotate-90" : ""}`}
        />
      </button>
      <div
        id={resultsId}
        inert={!expanded}
        aria-hidden={!expanded}
        className={`duration-normal grid transition-[grid-template-rows,opacity] ease-out motion-reduce:transition-none ${expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
      >
        <div className="min-h-0 overflow-hidden">
          {newest && hasExpanded ? (
            <div className="bg-background rounded-lg p-3">
              <ScanRunDetail
                key={newest.id}
                organizationId={organizationId}
                run={newest}
              />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
