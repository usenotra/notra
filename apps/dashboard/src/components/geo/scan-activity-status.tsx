import { Loading03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@notra/ui/components/ui/select";

import type { GeoScanActivityStatusProps } from "@/types/geo-scan-activity";
import { formatRelative } from "@/utils/format-relative";
import { formatScanRunOption, geoRunProgress } from "@/utils/geo-scan-activity";

function scanSentence(run: GeoScanActivityStatusProps["run"]): string {
  if (!run) {
    return "A scan is starting.";
  }
  if (run.status === "running") {
    const total = run.plan
      ? ` of ${run.plan.totalChecks.toLocaleString()}`
      : "";
    return `Scanning now, ${run.checks.toLocaleString()}${total} answers saved.`;
  }
  const when = formatRelative(run.finishedAt ?? run.startedAt);
  return run.status === "failed"
    ? `This scan stopped early ${when}.`
    : `Answers from this scan, ${when}.`;
}

/** Section header for scans: status for one run, or a recency picker. */
export function ScanActivityStatus({
  run,
  runs,
  onSelectRun,
}: GeoScanActivityStatusProps) {
  const running = !run || run.status === "running";
  const progress = run ? geoRunProgress(run) : null;
  const showPicker = Boolean(run && runs.length > 1);

  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
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
          {showPicker && run ? (
            <Select onValueChange={onSelectRun} value={run.id}>
              <SelectTrigger aria-label="Scan by recency" size="sm">
                <SelectValue>{formatScanRunOption(run)}</SelectValue>
              </SelectTrigger>
              <SelectContent align="start">
                {runs.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {formatScanRunOption(item)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
        </div>
        <p
          aria-atomic="true"
          aria-live="polite"
          className="text-muted-foreground text-sm tabular-nums"
        >
          {scanSentence(run)}
        </p>
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
