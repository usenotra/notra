import { Loading03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import type { GeoScanActivityStatusProps } from "@/types/geo-scan-activity";
import { geoRunProgress } from "@/utils/geo-scan-activity";

function scanSentence(run: GeoScanActivityStatusProps["run"]): string | null {
  if (!run) {
    return "A scan is starting.";
  }
  if (run.status !== "running") {
    return null;
  }
  const total = run.plan ? ` of ${run.plan.totalChecks.toLocaleString()}` : "";
  return `Scanning now, ${run.checks.toLocaleString()}${total} answers saved.`;
}

/** Section header for scans. Live status only — older answers are in the table. */
export function ScanActivityStatus({ run }: GeoScanActivityStatusProps) {
  const running = !run || run.status === "running";
  const progress = run ? geoRunProgress(run) : null;
  const sentence = scanSentence(run);

  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0 space-y-1">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          Scans
          {running ? (
            <HugeiconsIcon
              aria-hidden="true"
              className="text-primary motion-safe:animate-spin"
              icon={Loading03Icon}
              size={14}
            />
          ) : null}
        </h2>
        {sentence ? (
          <p
            aria-atomic="true"
            aria-live="polite"
            className="text-muted-foreground text-sm tabular-nums"
          >
            {sentence}
          </p>
        ) : null}
      </div>
      {running && progress !== null ? (
        <progress
          aria-label="Saved scan answers"
          className="bg-border [&::-moz-progress-bar]:bg-primary [&::-webkit-progress-bar]:bg-border [&::-webkit-progress-value]:bg-primary mt-2 h-1 w-32 shrink-0 overflow-hidden rounded-full"
          max={100}
          value={progress}
        />
      ) : null}
    </div>
  );
}
