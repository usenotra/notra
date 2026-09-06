"use client";

import {
  GEO_SCAN_PREFLIGHT_BODY,
  GEO_SCAN_PREFLIGHT_CANCEL,
  GEO_SCAN_PREFLIGHT_CONFIRM,
  GEO_SCAN_PREFLIGHT_ENGINES_LABEL,
  GEO_SCAN_PREFLIGHT_LANGUAGES_LABEL,
  GEO_SCAN_PREFLIGHT_LAST_SCAN_LABEL,
  GEO_SCAN_PREFLIGHT_PENDING,
  GEO_SCAN_PREFLIGHT_PROMPTS_LABEL,
  GEO_SCAN_PREFLIGHT_TITLE,
  GEO_SCAN_SIZE_DANGER,
  GEO_SCAN_SIZE_LABEL,
  GEO_SCAN_SIZE_WARN,
} from "@notra/geo-core/constants/geo";
import {
  calcGeoScanSize,
  geoScanSizeSeverity,
} from "@notra/geo-core/utils/geo-scan";
import {
  ResponsiveAlertDialog,
  ResponsiveAlertDialogAction,
  ResponsiveAlertDialogCancel,
  ResponsiveAlertDialogContent,
  ResponsiveAlertDialogDescription,
  ResponsiveAlertDialogFooter,
  ResponsiveAlertDialogHeader,
  ResponsiveAlertDialogTitle,
} from "@notra/ui/components/shared/responsive-alert-dialog";

import type { ScanPreflightDialogProps } from "@/types/geo";
import {
  formatScanPreflightLastScan,
  scanPreflightEngineNames,
} from "@/utils/geo-scan-preflight";

export function ScanPreflightDialog({
  open,
  onOpenChange,
  onConfirm,
  isPending,
  promptCount,
  engines,
  languages,
  lastScanAt,
}: ScanPreflightDialogProps) {
  const engineNames = scanPreflightEngineNames(engines);
  const scanSize = calcGeoScanSize({
    promptCount,
    engineCount: engines.length,
    languageCount: languages.length,
  });
  const scanSizeSeverity = geoScanSizeSeverity(scanSize);

  return (
    <ResponsiveAlertDialog onOpenChange={onOpenChange} open={open}>
      <ResponsiveAlertDialogContent>
        <ResponsiveAlertDialogHeader>
          <ResponsiveAlertDialogTitle>
            {GEO_SCAN_PREFLIGHT_TITLE}
          </ResponsiveAlertDialogTitle>
          <ResponsiveAlertDialogDescription>
            {GEO_SCAN_PREFLIGHT_BODY}
          </ResponsiveAlertDialogDescription>
        </ResponsiveAlertDialogHeader>
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm">
          <dt className="text-muted-foreground">
            {GEO_SCAN_PREFLIGHT_PROMPTS_LABEL}
          </dt>
          <dd className="tabular-nums">{promptCount.toLocaleString()}</dd>
          <dt className="text-muted-foreground">
            {GEO_SCAN_PREFLIGHT_ENGINES_LABEL}
          </dt>
          <dd className="min-w-0">
            <span className="tabular-nums">{engines.length}</span>
            {engineNames.length > 0 ? (
              <span className="text-muted-foreground">
                {" · "}
                {engineNames.join(", ")}
              </span>
            ) : null}
          </dd>
          <dt className="text-muted-foreground">
            {GEO_SCAN_PREFLIGHT_LANGUAGES_LABEL}
          </dt>
          <dd className="min-w-0">
            <span className="tabular-nums">{languages.length}</span>
            {languages.length > 0 ? (
              <span className="text-muted-foreground">
                {" · "}
                {languages.join(", ")}
              </span>
            ) : null}
          </dd>
          <dt className="text-muted-foreground">{GEO_SCAN_SIZE_LABEL}</dt>
          <dd className="tabular-nums">{scanSize.toLocaleString()}</dd>
          <dt className="text-muted-foreground">
            {GEO_SCAN_PREFLIGHT_LAST_SCAN_LABEL}
          </dt>
          <dd>{formatScanPreflightLastScan(lastScanAt)}</dd>
        </dl>
        {scanSizeSeverity !== "ok" ? (
          <p
            className={
              scanSizeSeverity === "danger"
                ? "text-destructive text-sm"
                : "text-sm text-amber-600 dark:text-amber-500"
            }
            role="note"
          >
            {scanSizeSeverity === "danger"
              ? GEO_SCAN_SIZE_DANGER
              : GEO_SCAN_SIZE_WARN}
          </p>
        ) : null}
        <ResponsiveAlertDialogFooter>
          <ResponsiveAlertDialogCancel disabled={isPending}>
            {GEO_SCAN_PREFLIGHT_CANCEL}
          </ResponsiveAlertDialogCancel>
          <ResponsiveAlertDialogAction disabled={isPending} onClick={onConfirm}>
            {isPending
              ? GEO_SCAN_PREFLIGHT_PENDING
              : GEO_SCAN_PREFLIGHT_CONFIRM}
          </ResponsiveAlertDialogAction>
        </ResponsiveAlertDialogFooter>
      </ResponsiveAlertDialogContent>
    </ResponsiveAlertDialog>
  );
}
