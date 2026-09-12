import {
  Loading03Icon,
  MinusSignIcon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import type { GeoScanActivityStatusProps } from "@/types/geo-scan-activity";
import { geoRunProgress } from "@/utils/geo-scan-activity";

export function ScanActivityStatus({ run }: GeoScanActivityStatusProps) {
  const status = run?.status ?? "running";
  const running = status === "running";
  const progress = run ? geoRunProgress(run) : null;

  return (
    <>
      <span
        className={
          status === "completed"
            ? "bg-success/15 text-success flex size-6 shrink-0 items-center justify-center rounded-full shadow-[inset_0_1px_2px_oklch(0_0_0/0.18)]"
            : "flex size-6 shrink-0 items-center justify-center rounded-full"
        }
      >
        {running ? (
          <HugeiconsIcon
            aria-hidden="true"
            className="text-primary motion-safe:animate-spin"
            icon={Loading03Icon}
            size={14}
          />
        ) : (
          <HugeiconsIcon
            aria-hidden="true"
            icon={status === "completed" ? Tick02Icon : MinusSignIcon}
            size={14}
          />
        )}
      </span>
      <span className="font-medium">
        {running ? "Scanning" : null}
        {status === "completed" ? "Scan complete" : null}
        {status === "failed" ? "Scan stopped" : null}
      </span>
      <span className="text-muted-foreground tabular-nums">
        {run
          ? `${run.checks}${run.plan ? ` / ${run.plan.totalChecks}` : ""} answers saved`
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
    </>
  );
}
