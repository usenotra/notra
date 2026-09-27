import { Loading03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useLocale, useTranslations } from "next-intl";

import { useFormatRelative } from "@/lib/hooks/use-format-relative";
import type {
  GeoScanActivityStatusProps,
  ScanActivityRelativeFormatter,
  ScanActivityStatusTranslator,
} from "@/types/geo-scan-activity";
import { geoRunProgress } from "@/utils/geo-scan-activity";

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
  const when = formatRelative(run.finishedAt ?? run.startedAt);
  return run.status === "failed"
    ? t("failed", { when })
    : t("finished", { when });
}

/** Section header for scans: a short status sentence and live progress. */
export function ScanActivityStatus({ run }: GeoScanActivityStatusProps) {
  const t = useTranslations("geo.scanActivityStatus");
  const tGeoShared = useTranslations("geo.shared");
  const locale = useLocale();
  const formatRelative = useFormatRelative();
  const running = !run || run.status === "running";
  const progress = run ? geoRunProgress(run) : null;

  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0 space-y-1">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          {tGeoShared("scans")}
          {running ? (
            <HugeiconsIcon
              aria-hidden="true"
              className="text-primary motion-safe:animate-spin"
              icon={Loading03Icon}
              size={14}
            />
          ) : null}
        </h2>
        <p className="text-muted-foreground text-sm tabular-nums">
          {scanSentence(run, t, formatRelative, locale)}
        </p>
      </div>
      {running && progress !== null ? (
        <progress
          aria-label={t("progressLabel")}
          className="bg-border [&::-moz-progress-bar]:bg-primary [&::-webkit-progress-bar]:bg-border [&::-webkit-progress-value]:bg-primary mt-2 h-1 w-32 shrink-0 overflow-hidden rounded-full"
          max={100}
          value={progress}
        />
      ) : null}
    </div>
  );
}
