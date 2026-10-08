"use client";

import {
  AiChat02Icon,
  Clock01Icon,
  Loading03Icon,
  MinusSignIcon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { GEO_SCAN_RESULTS_PAGE_SIZE } from "@notra/geo-core/constants/geo-scan-history";
import type { GeoScanResultSummary } from "@notra/geo-core/types/geo-scan-history";
import { TruncateWithTooltip } from "@notra/ui/components/shared/truncate-with-tooltip";
import { Badge } from "@notra/ui/components/ui/badge";
import {
  DataTableSkeleton,
  DataTable,
  type DataTablePagination,
  type TableColumn,
} from "@notra/ui/components/ui/data-table";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@notra/ui/components/ui/empty";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@notra/ui/components/ui/select";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@notra/ui/components/ui/tabs";
import { type ReactNode, useState } from "react";
import { useLocale, useTranslations } from "use-intl";

import { Button } from "@/components/button";
import { EngineIcon } from "@/components/geo/engine-icon";
import { ScanActivityStatus } from "@/components/geo/scan-activity-status";
import { ScanAnswerSheet } from "@/components/geo/scan-answer-sheet";
import { GEO_LOG_ARRIVE_STAGGER_STEPS } from "@/constants/geo-citations";
import { TABLE_ROW_HEIGHT } from "@/constants/table";
import { useArrivedRowIds } from "@/lib/hooks/use-arrived-row-ids";
import { useIsGeoScanning } from "@/lib/hooks/use-geo";
import { useGeoScanRun } from "@/lib/hooks/use-geo-scan-history";
import type {
  GeoScanModelCellProps,
  GeoScanOpenAnswer,
  GeoScanPendingAnswer,
  GeoScanPromptCellProps,
  GeoScanRunAnswersTableProps,
  GeoScanRunDetailProps,
  GeoScanRunDetailState,
  GeoScanRunEmptyProps,
  GeoScanRunLoadedProps,
  GeoScanRunEmptyStateInput,
  GeoScanRunFiltersProps,
  GeoScanRunPendingTableProps,
  GeoScanRunView,
  GeoScanViewCountProps,
  ScanRunDetailTranslator,
} from "@/types/geo-scan-activity";
import type { GeoSharedTranslator } from "@/types/geo-shared";
import type { CommonTranslator } from "@/types/i18n";
import { formatEngineFamily } from "@/utils/geo-charts";
import {
  hasScanActivityStatus,
  runProgress,
  scanRunDetailView,
} from "@/utils/geo-scan-activity";

const ALL_MODELS = "";
const SCAN_SKELETON_ROWS = 3;
const INITIAL_SCAN_RUN_STATE: GeoScanRunDetailState = {
  runId: null,
  view: "answers",
  offset: 0,
  pendingOffset: 0,
  engine: ALL_MODELS,
};

function ModelCell({ engine }: GeoScanModelCellProps) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <EngineIcon className="size-3.5 shrink-0" engine={engine} />
      <TruncateWithTooltip>{formatEngineFamily(engine)}</TruncateWithTooltip>
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

function scanPagination(
  offset: number,
  total: number,
  itemLabel: string,
  onOffsetChange: (offset: number) => void
): DataTablePagination {
  return {
    mode: "server",
    page: Math.floor(offset / GEO_SCAN_RESULTS_PAGE_SIZE) + 1,
    pageSize: GEO_SCAN_RESULTS_PAGE_SIZE,
    totalItems: total,
    itemLabel,
    onPageChange: (page) =>
      onOffsetChange((page - 1) * GEO_SCAN_RESULTS_PAGE_SIZE),
  };
}

function scanRunEmptyState(
  { running, isError, hasData, loading, onRetry }: GeoScanRunEmptyStateInput,
  t: ScanRunDetailTranslator,
  tCommon: CommonTranslator
): ReactNode {
  if (isError && !hasData) {
    return (
      <span className="text-muted-foreground flex flex-col items-center gap-2">
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
  offset,
  onOffsetChange,
  total,
  height,
  loading,
}: GeoScanRunPendingTableProps) {
  const t = useTranslations("geo.scanRunDetail");
  const tShared = useTranslations("geo.shared");
  const tCommon = useTranslations("common");
  return (
    <DataTable
      columns={pendingColumns(showLanguage, t, tShared, tCommon)}
      data={pending}
      emptyState={emptyState}
      pagination={scanPagination(
        offset,
        total,
        t("itemMissing"),
        onOffsetChange
      )}
      getRowId={(row) => row.key}
      height={height}
      loading={loading}
      rowHeight={TABLE_ROW_HEIGHT}
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
  onRowClick,
  progress,
  viewKey,
}: GeoScanRunAnswersTableProps) {
  const t = useTranslations("geo.scanRunDetail");
  const tShared = useTranslations("geo.shared");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const arrivals = useArrivedRowIds({
    ids: results.map((row) => row.id),
    viewKey,
    ready: !loading,
    enabled: progress !== null,
  });
  const pagination = scanPagination(
    offset,
    total,
    t("itemAnswers"),
    onOffsetChange
  );
  return (
    <DataTable
      columns={answerColumns(showLanguage, t, tShared, tCommon, locale)}
      data={results}
      emptyState={emptyState}
      pagination={
        progress
          ? {
              ...pagination,
              formatRange: () =>
                t("progress", {
                  checks: progress.checks.toLocaleString(locale),
                  total: progress.total.toLocaleString(locale),
                }),
            }
          : pagination
      }
      getRowClassName={(row) => {
        const order = arrivals.get(row.id);
        return order === undefined
          ? undefined
          : `geo-log-row-arrive geo-log-arrive-${Math.min(order, GEO_LOG_ARRIVE_STAGGER_STEPS)}`;
      }}
      getRowId={(row) => row.id}
      height={height}
      loading={loading}
      onRowClick={onRowClick}
      rowHeight={TABLE_ROW_HEIGHT}
      skeletonRows={GEO_SCAN_RESULTS_PAGE_SIZE / 2}
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
  const showViews = pendingCount > 0 && !running;
  const showEngines = engines.length > 1;
  const pendingLabel = t("missing");
  if (!(showViews || showEngines)) {
    return null;
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      {showViews ? (
        <Tabs
          onValueChange={(value) => {
            if (value === "answers" || value === "pending") {
              onViewChange(value);
            }
          }}
          value={view}
        >
          <TabsList aria-label={t("viewLabel")}>
            <TabsTrigger value="answers">
              {tGeoShared("answers")}
              <ViewCount count={answerCount} locale={locale} />
            </TabsTrigger>
            <TabsTrigger value="pending">
              {pendingLabel}
              <ViewCount count={pendingCount} locale={locale} />
            </TabsTrigger>
          </TabsList>
        </Tabs>
      ) : null}
      {showEngines ? (
        <Select
          onValueChange={(value) => onEngineChange(value ?? ALL_MODELS)}
          value={engine}
        >
          <SelectTrigger
            aria-label={t("filterByModel")}
            className="max-w-64 min-w-36"
          >
            <SelectValue>
              {engine === ALL_MODELS ? (
                tGeoShared("allModels")
              ) : (
                <>
                  <EngineIcon className="size-3.5" engine={engine} />
                  <span className="truncate">{formatEngineFamily(engine)}</span>
                </>
              )}
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
                  {formatEngineFamily(item)}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}
    </div>
  );
}

function ViewCount({ count, locale }: GeoScanViewCountProps) {
  return (
    <span className="text-muted-foreground/70 text-xs font-normal tabular-nums">
      {count.toLocaleString(locale)}
    </span>
  );
}

function ScanRunEmpty({ isError, onRetry }: GeoScanRunEmptyProps) {
  const t = useTranslations("geo.scanRunDetail");
  const tEmpty = useTranslations("geo.scanActivityStatus.empty");
  const tCommon = useTranslations("common");
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <HugeiconsIcon icon={AiChat02Icon} />
        </EmptyMedia>
        <EmptyTitle>{isError ? t("loadError") : tEmpty("title")}</EmptyTitle>
        {isError ? null : (
          <EmptyDescription>{tEmpty("description")}</EmptyDescription>
        )}
      </EmptyHeader>
      {isError ? (
        <EmptyContent>
          <Button onClick={onRetry} size="sm" variant="outline">
            {tCommon("actions.tryAgain")}
          </Button>
        </EmptyContent>
      ) : null}
    </Empty>
  );
}

/** Answers of the project's newest scan: status line, filters and table. */
export function ScanRunDetail({ organizationId }: GeoScanRunDetailProps) {
  const tGeoShared = useTranslations("geo.shared");
  const isScanning = useIsGeoScanning(organizationId);
  const [state, setState] = useState(INITIAL_SCAN_RUN_STATE);
  const query = useGeoScanRun(
    organizationId,
    undefined,
    state.offset,
    state.engine || undefined,
    state.pendingOffset
  );
  const run = query.data?.run;
  // A newer scan replaced the one on screen: its pages and models differ.
  if (run && run.id !== state.runId) {
    setState({ ...INITIAL_SCAN_RUN_STATE, runId: run.id });
  }

  if (query.isPending) {
    return (
      <section aria-hidden="true" className="space-y-3">
        <Skeleton className="h-5 w-64 max-w-full" />
        <DataTableSkeleton rows={SCAN_SKELETON_ROWS} />
      </section>
    );
  }
  if (run) {
    return (
      <ScanRunLoaded
        onStateChange={setState}
        organizationId={organizationId}
        query={query}
        run={run}
        state={state}
      />
    );
  }
  if (isScanning && !query.isError) {
    return (
      <section aria-label={tGeoShared("scans")}>
        <DataTableSkeleton rows={SCAN_SKELETON_ROWS} />
      </section>
    );
  }
  return (
    <ScanRunEmpty
      isError={query.isError}
      onRetry={() => {
        void query.refetch();
      }}
    />
  );
}

function ScanRunLoaded({
  organizationId,
  run,
  query,
  state,
  onStateChange: setState,
}: GeoScanRunLoadedProps) {
  const t = useTranslations("geo.scanRunDetail");
  const tGeoShared = useTranslations("geo.shared");
  const tCommon = useTranslations("common");
  // Pin the open answer to its scan so a newer run can't swap the sheet's scope.
  const [openAnswer, setOpenAnswer] = useState<GeoScanOpenAnswer | null>(null);
  const checkId = openAnswer?.checkId ?? null;
  const model = scanRunDetailView({
    run,
    view: state.view,
    data: query.data ?? undefined,
    isPending: query.isPending,
    isPlaceholderData: query.isPlaceholderData,
    pendingOffset: state.pendingOffset,
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
  const table =
    model.activeView === "pending" ? (
      <ScanRunPendingTable
        emptyState={emptyState}
        height={model.height}
        loading={model.loading}
        offset={model.pendingOffset}
        onOffsetChange={(pendingOffset) =>
          setState((prev) => ({ ...prev, pendingOffset }))
        }
        pending={model.pending}
        showLanguage={model.showLanguage}
        total={model.pendingTotal}
      />
    ) : (
      <ScanRunAnswersTable
        emptyState={emptyState}
        height={model.height}
        loading={model.loading}
        offset={state.offset}
        onOffsetChange={(offset) => setState((prev) => ({ ...prev, offset }))}
        onRowClick={(row) =>
          setOpenAnswer({
            checkId: row.id,
            scanId: run.id,
            language: row.language,
          })
        }
        progress={runProgress(run)}
        results={model.results}
        showLanguage={model.showLanguage}
        total={model.total}
        viewKey={`${run.id}:${state.offset}:${state.engine}`}
      />
    );

  return (
    <section
      aria-busy={model.loading}
      aria-label={tGeoShared("scans")}
      className="min-w-0 space-y-3"
    >
      {hasScanActivityStatus(run) || model.hasFilters ? (
        <div className="flex min-h-8 flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <ScanActivityStatus run={run} />
          {model.hasFilters ? (
            <ScanRunFilters
              answerCount={model.answerCount}
              engine={state.engine}
              engines={model.engines}
              onEngineChange={(engine) =>
                setState((prev) => ({
                  ...prev,
                  engine,
                  offset: 0,
                  pendingOffset: 0,
                }))
              }
              onViewChange={(view) => setState((prev) => ({ ...prev, view }))}
              pendingCount={model.pendingTotal}
              running={model.running}
              view={model.activeView}
            />
          ) : null}
        </div>
      ) : null}
      {table}
      <ScanAnswerSheet
        checkId={checkId}
        initialLanguage={openAnswer?.language}
        key={checkId}
        onClose={() => setOpenAnswer(null)}
        organizationId={organizationId}
        scanId={openAnswer?.scanId ?? run.id}
      />
    </section>
  );
}
