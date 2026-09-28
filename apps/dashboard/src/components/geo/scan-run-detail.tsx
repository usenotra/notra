"use client";

import {
  Clock01Icon,
  Loading03Icon,
  MinusSignIcon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { GEO_SCAN_RESULTS_PAGE_SIZE } from "@notra/geo-core/constants/geo-scan-history";
import type { GeoScanResultSummary } from "@notra/geo-core/types/geo-scan-history";
import { TablePagination } from "@notra/ui/components/shared/table-pagination";
import { TruncateWithTooltip } from "@notra/ui/components/shared/truncate-with-tooltip";
import { Badge } from "@notra/ui/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@notra/ui/components/ui/select";
import { useLocale, useTranslations } from "next-intl";
import { type ReactNode, useState } from "react";

import { Button } from "@/components/button";
import { EngineIcon } from "@/components/geo/engine-icon";
import { ScanAnswerSheet } from "@/components/geo/scan-answer-sheet";
import { Table, type TableColumn } from "@/components/motion/table";
import { TABLE_ROW_HEIGHT } from "@/constants/table";
import { useEngineModeLabel } from "@/lib/hooks/use-engine-mode-label";
import { useGeoScanRun } from "@/lib/hooks/use-geo-scan-history";
import type {
  GeoScanModelCellProps,
  GeoScanPendingAnswer,
  GeoScanPromptCellProps,
  GeoScanRunAnswersTableProps,
  GeoScanRunDetailProps,
  GeoScanRunEmptyStateInput,
  GeoScanRunFiltersProps,
  GeoScanRunPendingTableProps,
  GeoScanRunView,
  GeoScanTablePaginationProps,
  ScanRunDetailTranslator,
} from "@/types/geo-scan-activity";
import type { GeoSharedTranslator } from "@/types/geo-shared";
import type { CommonTranslator } from "@/types/i18n";
import { scanRunDetailView } from "@/utils/geo-scan-activity";

const ALL_MODELS = "";

function ModelCell({ engine }: GeoScanModelCellProps) {
  const formatEngineWithMode = useEngineModeLabel();
  return (
    <span className="flex min-w-0 items-center gap-2">
      <EngineIcon className="size-3.5 shrink-0" engine={engine} />
      <TruncateWithTooltip>{formatEngineWithMode(engine)}</TruncateWithTooltip>
    </span>
  );
}

function PromptCell({ prompt, turn }: GeoScanPromptCellProps) {
  const t = useTranslations("geo.scanRunDetail");
  return (
    <span className="flex min-w-0 items-center gap-2">
      <TruncateWithTooltip className="font-medium">
        {prompt}
      </TruncateWithTooltip>
      {turn === null ? null : (
        <span className="text-muted-foreground shrink-0 text-xs">
          {t("turn", { turn })}
        </span>
      )}
    </span>
  );
}

function answerColumns(
  showLanguage: boolean,
  t: ScanRunDetailTranslator,
  tShared: GeoSharedTranslator,
  tCommon: CommonTranslator,
  locale: string
): TableColumn<GeoScanResultSummary>[] {
  return [
    {
      key: "prompt",
      header: tShared("prompt"),
      width: "1fr",
      minWidth: "14rem",
      cell: (row) => (
        <PromptCell
          prompt={row.prompt}
          turn={row.sequenceId ? row.turn : null}
        />
      ),
    },
    {
      key: "engine",
      header: tCommon("labels.model"),
      width: "12.5rem",
      cell: (row) => <ModelCell engine={row.engine} />,
    },
    ...(showLanguage
      ? [
          {
            key: "language",
            header: tCommon("labels.language"),
            width: "7rem",
            cell: (row: GeoScanResultSummary) => (
              <span className="text-muted-foreground">{row.language}</span>
            ),
          },
        ]
      : []),
    {
      key: "mentioned",
      header: t("columns.mention"),
      width: "9.5rem",
      cell: (row) => (
        <Badge variant={row.mentioned ? "success" : "secondary"}>
          <HugeiconsIcon
            aria-hidden="true"
            icon={row.mentioned ? Tick02Icon : MinusSignIcon}
          />
          {row.mentioned ? tShared("mentioned") : tShared("notMentioned")}
        </Badge>
      ),
    },
    {
      key: "position",
      align: "right",
      header: tCommon("labels.position"),
      width: "6rem",
      cell: (row) => (
        <span className="text-muted-foreground tabular-nums">
          {row.position === null ? "–" : `#${row.position}`}
        </span>
      ),
    },
    {
      key: "sources",
      align: "right",
      header: tCommon("labels.sources"),
      width: "6rem",
      cell: (row) => (
        <span className="text-muted-foreground tabular-nums">
          {row.sources.toLocaleString(locale)}
        </span>
      ),
    },
  ];
}

function pendingStatusLabel(
  status: GeoScanPendingAnswer["status"],
  t: ScanRunDetailTranslator,
  tCommon: CommonTranslator
) {
  if (status === "running") {
    return t("status.running");
  }
  if (status === "queued") {
    return tCommon("labels.queued");
  }
  return t("status.missing");
}

function pendingColumns(
  showLanguage: boolean,
  t: ScanRunDetailTranslator,
  tShared: GeoSharedTranslator,
  tCommon: CommonTranslator
): TableColumn<GeoScanPendingAnswer>[] {
  return [
    {
      key: "prompt",
      header: tShared("prompt"),
      width: "1fr",
      minWidth: "14rem",
      cell: (row) => <PromptCell prompt={row.prompt} turn={row.turn ?? null} />,
    },
    {
      key: "engine",
      header: tCommon("labels.model"),
      width: "12.5rem",
      cell: (row) => <ModelCell engine={row.engine} />,
    },
    ...(showLanguage
      ? [
          {
            key: "language",
            header: tCommon("labels.language"),
            width: "7rem",
            cell: (row: GeoScanPendingAnswer) => (
              <span className="text-muted-foreground">{row.language}</span>
            ),
          },
        ]
      : []),
    {
      key: "status",
      header: tCommon("labels.status"),
      width: "12rem",
      cell: (row) => (
        <span className="text-muted-foreground inline-flex items-center gap-2">
          <HugeiconsIcon
            aria-hidden="true"
            className={
              row.status === "running"
                ? "text-primary shrink-0 motion-safe:animate-spin"
                : "shrink-0"
            }
            icon={
              (row.status === "running" && Loading03Icon) ||
              (row.status === "queued" && Clock01Icon) ||
              MinusSignIcon
            }
            size={14}
          />
          {pendingStatusLabel(row.status, t, tCommon)}
        </span>
      ),
    },
  ];
}

function ScanTablePagination({
  offset,
  total,
  itemLabel,
  onOffsetChange,
}: GeoScanTablePaginationProps) {
  const page = Math.floor(offset / GEO_SCAN_RESULTS_PAGE_SIZE) + 1;
  const pageCount = Math.max(1, Math.ceil(total / GEO_SCAN_RESULTS_PAGE_SIZE));
  return (
    <TablePagination
      itemLabel={itemLabel}
      page={page}
      pageCount={pageCount}
      pageRowCount={Math.min(GEO_SCAN_RESULTS_PAGE_SIZE, total - offset)}
      pageSize={GEO_SCAN_RESULTS_PAGE_SIZE}
      setPage={(next) =>
        onOffsetChange(
          (Math.min(Math.max(1, next), pageCount) - 1) *
            GEO_SCAN_RESULTS_PAGE_SIZE
        )
      }
      totalItems={total}
    />
  );
}

function scanRunEmptyState(
  { running, isError, hasData, loading, onRetry }: GeoScanRunEmptyStateInput,
  t: ScanRunDetailTranslator,
  tCommon: CommonTranslator
): ReactNode {
  if (isError && !hasData) {
    return (
      <span className="flex flex-col items-center gap-2">
        {t("loadError")}
        <Button onClick={onRetry} size="sm" variant="outline">
          {tCommon("actions.tryAgain")}
        </Button>
      </span>
    );
  }
  if (!(loading || hasData)) {
    return t("unavailable");
  }
  return running ? t("waiting") : t("empty");
}

function ScanRunPendingTable({
  pending,
  showLanguage,
  emptyState,
  running,
  offset,
  onOffsetChange,
  total,
  height,
  loading,
  toolbar,
}: GeoScanRunPendingTableProps) {
  const t = useTranslations("geo.scanRunDetail");
  const tShared = useTranslations("geo.shared");
  const tCommon = useTranslations("common");
  return (
    <Table
      className="rounded-2xl"
      columns={pendingColumns(showLanguage, t, tShared, tCommon)}
      data={pending}
      emptyState={emptyState}
      footer={
        <ScanTablePagination
          itemLabel={running ? t("itemInProgress") : t("itemMissing")}
          offset={offset}
          onOffsetChange={onOffsetChange}
          total={total}
        />
      }
      getRowId={(row) => row.key}
      height={height}
      loading={loading}
      rowHeight={TABLE_ROW_HEIGHT}
      toolbar={toolbar}
    />
  );
}

function ScanRunAnswersTable({
  results,
  showLanguage,
  emptyState,
  offset,
  onOffsetChange,
  total,
  height,
  loading,
  toolbar,
  onRowClick,
}: GeoScanRunAnswersTableProps) {
  const t = useTranslations("geo.scanRunDetail");
  const tShared = useTranslations("geo.shared");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  return (
    <Table
      className="rounded-2xl"
      columns={answerColumns(showLanguage, t, tShared, tCommon, locale)}
      data={results}
      emptyState={emptyState}
      footer={
        total > 0 ? (
          <ScanTablePagination
            itemLabel={t("itemAnswers")}
            offset={offset}
            onOffsetChange={onOffsetChange}
            total={total}
          />
        ) : null
      }
      getRowId={(row) => row.id}
      height={height}
      loading={loading}
      onRowClick={onRowClick}
      rowHeight={TABLE_ROW_HEIGHT}
      skeletonRows={GEO_SCAN_RESULTS_PAGE_SIZE / 2}
      toolbar={toolbar}
    />
  );
}

export function ScanRunFilters({
  view,
  onViewChange,
  answerCount,
  pendingCount,
  running,
  engine,
  engines,
  onEngineChange,
}: GeoScanRunFiltersProps) {
  const t = useTranslations("geo.scanRunDetail");
  const tGeoShared = useTranslations("geo.shared");
  const locale = useLocale();
  const formatEngineWithMode = useEngineModeLabel();
  const showViews = pendingCount > 0;
  const showEngines = engines.length > 1;
  const pendingLabel = running ? tGeoShared("inProgress") : t("missing");
  if (!(showViews || showEngines)) {
    return null;
  }
  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-2.5">
      {showViews ? (
        <Select
          onValueChange={(value) => {
            if (value === "answers" || value === "pending") {
              onViewChange(value);
            }
          }}
          value={view}
        >
          <SelectTrigger aria-label={t("viewLabel")} className="min-w-36">
            <SelectValue>
              {view === "answers" ? tGeoShared("answers") : pendingLabel}
              <span className="text-muted-foreground text-xs tabular-nums">
                {(view === "answers"
                  ? answerCount
                  : pendingCount
                ).toLocaleString(locale)}
              </span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent align="start" alignItemWithTrigger={false}>
            <SelectItem value="answers">
              {tGeoShared("answers")}
              <span className="text-muted-foreground text-xs tabular-nums">
                {answerCount.toLocaleString(locale)}
              </span>
            </SelectItem>
            <SelectItem value="pending">
              {pendingLabel}
              <span className="text-muted-foreground text-xs tabular-nums">
                {pendingCount.toLocaleString(locale)}
              </span>
            </SelectItem>
          </SelectContent>
        </Select>
      ) : null}
      {showEngines ? (
        <Select
          onValueChange={(value) => onEngineChange(value ?? ALL_MODELS)}
          value={engine}
        >
          <SelectTrigger
            aria-label={t("filterByModel")}
            className="ml-auto max-w-56"
          >
            <SelectValue>
              {engine === ALL_MODELS
                ? tGeoShared("allModels")
                : formatEngineWithMode(engine)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent align="end" alignItemWithTrigger={false}>
            <SelectItem value={ALL_MODELS}>
              {tGeoShared("allModels")}
            </SelectItem>
            {engines.map((item) => (
              <SelectItem key={item} value={item}>
                <span className="flex items-center gap-2">
                  <EngineIcon className="size-3.5" engine={item} />
                  {formatEngineWithMode(item)}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}
    </div>
  );
}

export function ScanRunDetail({ organizationId, run }: GeoScanRunDetailProps) {
  const t = useTranslations("geo.scanRunDetail");
  const tCommon = useTranslations("common");
  const [view, setView] = useState<GeoScanRunView>("answers");
  const [pendingOffset, setPendingOffset] = useState(0);
  const [offset, setOffset] = useState(0);
  const [engine, setEngine] = useState(ALL_MODELS);
  const [checkId, setCheckId] = useState<string | null>(null);
  const query = useGeoScanRun(
    organizationId,
    run.id,
    offset,
    engine || undefined,
    pendingOffset
  );
  const model = scanRunDetailView({
    run,
    view,
    data: query.data,
    isPending: query.isPending,
    isPlaceholderData: query.isPlaceholderData,
    pendingOffset,
  });
  const emptyState = scanRunEmptyState(
    {
      running: model.running,
      isError: query.isError,
      hasData: Boolean(query.data),
      loading: model.loading,
      onRetry: () => {
        void query.refetch();
      },
    },
    t,
    tCommon
  );
  const toolbar = model.hasFilters ? (
    <ScanRunFilters
      answerCount={model.answerCount}
      engine={engine}
      engines={model.engines}
      onEngineChange={(next) => {
        setEngine(next);
        setOffset(0);
        setPendingOffset(0);
      }}
      onViewChange={setView}
      pendingCount={model.pendingTotal}
      running={model.running}
      view={model.activeView}
    />
  ) : undefined;
  const table =
    model.activeView === "pending" ? (
      <ScanRunPendingTable
        emptyState={emptyState}
        height={model.height}
        loading={model.loading}
        offset={model.pendingOffset}
        onOffsetChange={setPendingOffset}
        pending={model.pending}
        running={model.running}
        showLanguage={model.showLanguage}
        toolbar={toolbar}
        total={model.pendingTotal}
      />
    ) : (
      <ScanRunAnswersTable
        emptyState={emptyState}
        height={model.height}
        loading={model.loading}
        offset={offset}
        onOffsetChange={setOffset}
        onRowClick={(row) => setCheckId(row.id)}
        results={model.results}
        showLanguage={model.showLanguage}
        toolbar={toolbar}
        total={model.total}
      />
    );

  return (
    <div aria-busy={model.loading} className="min-w-0">
      {table}
      <ScanAnswerSheet
        checkId={checkId}
        initialLanguage={
          model.results.find((result) => result.id === checkId)?.language
        }
        key={checkId}
        onClose={() => setCheckId(null)}
        organizationId={organizationId}
        scanId={run.id}
      />
    </div>
  );
}
