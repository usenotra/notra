"use client";

import {
  Alert02Icon,
  Csv01Icon,
  Download01Icon,
  Upload01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  GEO_CSV_IMPORT_ACCEPT,
  GEO_CSV_IMPORT_MAX_BYTES,
  GEO_CSV_IMPORT_MAX_ISSUES_SHOWN,
  GEO_IMPORT_COPY,
} from "@notra/geo-core/constants/geo-import";
import {
  parseCompetitorsCsv,
  parsePromptsCsv,
  readGeoCsvFile,
} from "@notra/geo-core/geo/csv-import";
import type {
  GeoCsvIssue,
  GeoCsvSelection,
} from "@notra/geo-core/types/geo-import";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import { Dropzone } from "@notra/ui/components/kibo-ui/dropzone";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@notra/ui/components/shared/responsive-dialog";
import { Effect } from "effect";
import { useState } from "react";
import { toast } from "sonner";
import { useLocale, useTranslations } from "use-intl";

import { Button } from "@/components/button";
import { StatusSpinner } from "@/components/geo/status-spinner";
import { trackEvent } from "@/lib/analytics/posthog-client";
import {
  useGeoImportCompetitors,
  useGeoImportPrompts,
} from "@/lib/hooks/use-geo";
import { cn } from "@/lib/utils";
import type {
  GeoCsvImportDialogProps,
  GeoImportDialogProps,
} from "@/types/components/geo";
import { downloadBlob } from "@/utils/download";
import { formatCsvFileSize } from "@/utils/geo-import";

function CsvIssueList({ issues }: { issues: GeoCsvIssue[] }) {
  const t = useTranslations("geo.geoCsvImportDialog");
  const visible = issues.slice(0, GEO_CSV_IMPORT_MAX_ISSUES_SHOWN);
  const hidden = issues.length - visible.length;
  return (
    <ul className="space-y-1 text-xs">
      {visible.map((issue) => (
        <li
          className="text-muted-foreground flex gap-2"
          key={`${issue.line}:${issue.message}`}
        >
          <span className="shrink-0 tabular-nums">
            {t("line", { line: issue.line })}
          </span>
          <span className="text-foreground">{issue.message}</span>
        </li>
      ))}
      {hidden > 0 ? (
        <li className="text-muted-foreground">
          {t("moreIssues", { count: hidden })}
        </li>
      ) : null}
    </ul>
  );
}

function CsvSummaryRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "warning";
}) {
  return (
    <div className="flex items-center justify-between px-3 py-2">
      <span className="text-muted-foreground flex items-center gap-1.5">
        {tone === "warning" ? (
          <HugeiconsIcon className="text-warning size-3.5" icon={Alert02Icon} />
        ) : null}
        {label}
      </span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

function GeoCsvImportDialog<TRow>({
  open,
  onOpenChange,
  kind,
  parse,
  onImport,
  isPending,
}: GeoCsvImportDialogProps<TRow>) {
  const t = useTranslations("geo.geoCsvImportDialog");
  const tCommon = useTranslations("common.actions");
  const tGeoShared = useTranslations("geo.shared");
  const importLabel =
    kind === "prompts"
      ? tGeoShared("importPrompts")
      : tGeoShared("importCompetitors");
  const locale = useLocale();
  const [selection, setSelection] = useState<GeoCsvSelection<TRow> | null>(
    null
  );
  const copy = GEO_IMPORT_COPY[kind];
  const rows = selection?.result.rows ?? [];
  const issues = selection?.result.issues ?? [];
  const duplicates = selection?.result.duplicates ?? 0;
  const canImport = rows.length > 0 && !isPending;

  const close = () => {
    setSelection(null);
    onOpenChange(false);
  };

  const handleDrop = (files: File[]) => {
    const file = files.at(0);
    if (!file) {
      return;
    }
    Effect.runFork(
      readGeoCsvFile(file, parse).pipe(
        Effect.match({
          onSuccess: setSelection,
          onFailure: () => toast.error(t("readFailed")),
        })
      )
    );
  };

  const handleImport = () => {
    if (!canImport) {
      return;
    }
    Effect.runFork(
      Effect.tryPromise(() => onImport(rows)).pipe(
        Effect.match({
          onSuccess: close,
          onFailure: () => undefined,
        })
      )
    );
  };

  const downloadTemplate = () => {
    trackEvent(POSTHOG_EVENTS.GEO_CSV_TEMPLATE_DOWNLOADED, { kind });
    downloadBlob(
      new Blob([copy.template], { type: "text/csv;charset=utf-8" }),
      copy.templateFilename
    );
  };

  return (
    <ResponsiveDialog
      onOpenChange={(next) => {
        if (next) {
          onOpenChange(true);
          return;
        }
        close();
      }}
      open={open}
    >
      <ResponsiveDialogContent className="sm:max-w-md">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{importLabel}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {t(`kinds.${kind}.description`)}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <div className="space-y-3 px-4 md:px-0">
          <Dropzone
            accept={GEO_CSV_IMPORT_ACCEPT}
            className={cn(
              "border-dashed p-6 transition-colors",
              selection && "border-solid"
            )}
            disabled={isPending}
            maxFiles={1}
            maxSize={GEO_CSV_IMPORT_MAX_BYTES}
            onDrop={handleDrop}
            onError={() =>
              toast.error(
                t("fileRejected", {
                  size: formatCsvFileSize(GEO_CSV_IMPORT_MAX_BYTES, locale),
                })
              )
            }
            src={selection ? [selection.file] : undefined}
          >
            {selection ? (
              <div className="flex w-full items-center gap-3 text-left">
                <div className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-lg">
                  <HugeiconsIcon className="size-4" icon={Csv01Icon} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {selection.file.name}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {t("replaceHint", {
                      size: formatCsvFileSize(selection.file.size, locale),
                    })}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1.5 text-center">
                <div className="bg-muted text-muted-foreground flex size-9 items-center justify-center rounded-lg">
                  <HugeiconsIcon className="size-4" icon={Upload01Icon} />
                </div>
                <p className="text-sm font-medium">{t("dropTitle")}</p>
                <p className="text-muted-foreground text-xs">
                  {t("dropHint", {
                    size: formatCsvFileSize(GEO_CSV_IMPORT_MAX_BYTES, locale),
                  })}
                </p>
              </div>
            )}
          </Dropzone>
          {selection ? (
            <div className="divide-y rounded-lg border text-sm">
              <CsvSummaryRow label={t("ready")} value={rows.length} />
              {duplicates > 0 ? (
                <CsvSummaryRow label={t("duplicates")} value={duplicates} />
              ) : null}
              {issues.length > 0 ? (
                <div className="space-y-2 pb-3">
                  <CsvSummaryRow
                    label={t("problems")}
                    tone="warning"
                    value={issues.length}
                  />
                  <div className="px-3">
                    <CsvIssueList issues={issues} />
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
          <div className="flex justify-end">
            <Button
              className="h-auto shrink-0 gap-1 px-0 text-xs"
              onClick={downloadTemplate}
              size="xs"
              type="button"
              variant="link"
            >
              <HugeiconsIcon className="size-3" icon={Download01Icon} />
              {t("downloadTemplate")}
            </Button>
          </div>
        </div>
        <ResponsiveDialogFooter>
          <Button
            disabled={isPending}
            onClick={close}
            type="button"
            variant="outline"
          >
            {tCommon("cancel")}
          </Button>
          <Button disabled={!canImport} onClick={handleImport} type="button">
            {isPending ? <StatusSpinner /> : null}
            {rows.length > 0
              ? t(`kinds.${kind}.importCount`, { count: rows.length })
              : importLabel}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

export function PromptsCsvImportDialog({
  open,
  onOpenChange,
  organizationId,
}: GeoImportDialogProps) {
  const importPrompts = useGeoImportPrompts(organizationId);
  return (
    <GeoCsvImportDialog
      isPending={importPrompts.isPending}
      kind="prompts"
      onImport={(rows) => importPrompts.mutateAsync(rows)}
      onOpenChange={onOpenChange}
      open={open}
      parse={parsePromptsCsv}
    />
  );
}

export function CompetitorsCsvImportDialog({
  open,
  onOpenChange,
  organizationId,
}: GeoImportDialogProps) {
  const importCompetitors = useGeoImportCompetitors(organizationId);
  return (
    <GeoCsvImportDialog
      isPending={importCompetitors.isPending}
      kind="competitors"
      onImport={(rows) => importCompetitors.mutateAsync(rows)}
      onOpenChange={onOpenChange}
      open={open}
      parse={parseCompetitorsCsv}
    />
  );
}
