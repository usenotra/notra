import { Loading03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useLocale, useTranslations } from "next-intl";

import { useFormatRelative } from "@/lib/hooks/use-format-relative";
import type {
  GeoScanActivityStatusProps,
  ScanActivityRelativeFormatter,
  ScanActivityStatusTranslator,
} from "@/types/geo-scan-activity";
import {
  geoRunProgress,
  hasScanActivityStatus,
} from "@/utils/geo-scan-activity";

function scanSentence(
  run: GeoScanActivityStatusProps["run"],
  t: ScanActivityStatusTranslator,
  formatRelative: ScanActivityRelativeFormatter,
  locale: string
): string {
  if (!run) {
    return t("starting");
  }
  if (run.status === "running") {
    const checks = run.checks.toLocaleString(locale);
    return run.plan
      ? t("runningWithTotal", {
          checks,
          total: run.plan.totalChecks.toLocaleString(locale),
        })
      : t("running", { checks });
  }
  return t("failed", { when: formatRelative(run.finishedAt ?? run.startedAt) });
}

/** One-line scan status beside the answers filters; hidden once a scan finished. */
export function ScanActivityStatus({ run }: GeoScanActivityStatusProps) {
  const t = useTranslations("geo.scanActivityStatus");
  const locale = useLocale();
  const formatRelative = useFormatRelative();
  const running = !run || run.status === "running";
  const progress = run ? geoRunProgress(run) : null;
  if (!hasScanActivityStatus(run)) {
    return null;
  }

  return (
    <div className="flex min-w-0 items-center gap-3">
      <p className="text-muted-foreground flex min-w-0 items-center gap-2 text-sm tabular-nums">
        {running ? (
          <HugeiconsIcon
            aria-hidden="true"
            className="text-primary shrink-0 motion-safe:animate-spin"
            icon={Loading03Icon}
            size={14}
          />
        ) : null}
        <span className="truncate">
          {scanSentence(run, t, formatRelative, locale)}
        </span>
      </p>
      {running && progress !== null ? (
        <progress
          aria-label={t("progressLabel")}
          className="bg-border [&::-moz-progress-bar]:bg-primary [&::-webkit-progress-bar]:bg-border [&::-webkit-progress-value]:bg-primary h-1 w-24 shrink-0 overflow-hidden rounded-full"
          max={100}
          value={progress}
        />
      ) : null}
    </div>
  );
}
