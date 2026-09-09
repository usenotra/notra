"use client";

import {
  Loading03Icon,
  Tick02Icon,
  MinusSignIcon,
  ArrowRight01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useId, useState } from "react";

import { ScanRunDetail } from "@/components/geo/scan-run-detail";
import { useIsGeoScanning } from "@/lib/hooks/use-geo";
import { useGeoScanRuns } from "@/lib/hooks/use-geo-scan-history";
import type { GeoScanActivityProps } from "@/types/geo-scan-activity";
import { geoRunProgress } from "@/utils/geo-scan-activity";

export function ScanActivity({ organizationId }: GeoScanActivityProps) {
  const [expanded, setExpanded] = useState(false);
  const [hasExpanded, setHasExpanded] = useState(false);
  const resultsId = useId();
  const isScanning = useIsGeoScanning(organizationId);
  const latest = useGeoScanRuns(organizationId);
  const newest = latest.data?.runs[0];
  const running = newest?.status === "running";
  const progress = newest ? geoRunProgress(newest) : null;

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
        <span
          className={
            newest?.status === "completed"
              ? "bg-success/15 text-success flex size-6 shrink-0 items-center justify-center rounded-full shadow-[inset_0_1px_2px_oklch(0_0_0/0.18)]"
              : "flex size-6 shrink-0 items-center justify-center rounded-full"
          }
        >
          {running || !newest ? (
            <HugeiconsIcon
              aria-hidden="true"
              className="text-primary motion-safe:animate-spin"
              icon={Loading03Icon}
              size={14}
            />
          ) : (
            <HugeiconsIcon
              aria-hidden="true"
              icon={newest.status === "completed" ? Tick02Icon : MinusSignIcon}
              size={14}
            />
          )}
        </span>
        <span className="font-medium">
          {running || !newest ? "Scanning" : null}
          {newest?.status === "completed" ? "Scan complete" : null}
          {newest?.status === "failed" ? "Scan stopped" : null}
        </span>
        <span className="text-muted-foreground tabular-nums">
          {newest
            ? `${newest.checks}${newest.plan ? ` / ${newest.plan.totalChecks}` : ""} answers saved`
            : "Preparing scan…"}
        </span>
        {running && progress !== null ? (
          <progress
            aria-label="Saved scan answers"
            className="bg-border [&::-moz-progress-bar]:bg-primary [&::-webkit-progress-bar]:bg-border [&::-webkit-progress-value]:bg-primary ml-1 h-1 w-20 overflow-hidden rounded-full"
            max={100}
            value={progress}
          />
        ) : null}
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
