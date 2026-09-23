"use client";

import { Loading03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { GEO_SCAN_RESULTS_PAGE_SIZE } from "@notra/geo-core/constants/geo-scan-history";
import type { GeoScanResultSummary } from "@notra/geo-core/types/geo-scan-history";
import { TablePagination } from "@notra/ui/components/shared/table-pagination";
import { TruncateWithTooltip } from "@notra/ui/components/shared/truncate-with-tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@notra/ui/components/ui/select";
import { type ReactNode, useState } from "react";

import { Button } from "@/components/button";
import { EngineIcon } from "@/components/geo/engine-icon";
import { ScanAnswerSheet } from "@/components/geo/scan-answer-sheet";
import { Table, type TableColumn } from "@/components/motion/table";
import { TABLE_ROW_HEIGHT } from "@/constants/table";
import { useGeoScanRun } from "@/lib/hooks/use-geo-scan-history";
import { cn } from "@/lib/utils";
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
} from "@/types/geo-scan-activity";
import { formatEngineFamily } from "@/utils/geo-charts";
import { scanRunDetailView } from "@/utils/geo-scan-activity";

const ALL_MODELS = "";

function ModelCell({ engine }: GeoScanModelCellProps) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <EngineIcon className="size-3.5 shrink-0" engine={engine} />
      <TruncateWithTooltip>{formatEngineFamily(engine)}</TruncateWithTooltip>
    </span>
  );
}

function PromptCell({ prompt, turn }: GeoScanPromptCellProps) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <TruncateWithTooltip className="font-medium">
        {prompt}
      </TruncateWithTooltip>
      {turn === null ? null : (
        <span className="text-muted-foreground shrink-0 text-xs">
          Turn {turn}
        </span>
      )}
    </span>
  );
}

function answerColumns(
  showLanguage: boolean
): TableColumn<GeoScanResultSummary>[] {
  return [
    {
      key: "prompt",
      header: "Prompt",
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
      header: "Model",
      width: "10rem",
      cell: (row) => <ModelCell engine={row.engine} />,
    },
    ...(showLanguage
      ? [
          {
            key: "language",
            header: "Language",
            width: "7rem",
            cell: (row: GeoScanResultSummary) => (
              <span className="text-muted-foreground">{row.language}</span>
            ),
          },
        ]
      : []),
    {
      key: "mentioned",
      header: "Mention",
      width: "5.5rem",
      cell: (row) =>
        row.mentioned ? (
          "Yes"
        ) : (
          <span className="text-muted-foreground">–</span>
        ),
    },
    {
      key: "position",
      align: "right",
      header: "Position",
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
      header: "Sources",
      width: "6rem",
      cell: (row) => (
        <span className="text-muted-foreground tabular-nums">
          {row.sources.toLocaleString()}
        </span>
      ),
    },
  ];
}

function pendingStatusLabel(status: GeoScanPendingAnswer["status"]) {
  if (status === "running") {
    return "Generating";
  }
  if (status === "queued") {
    return "Queued";
  }
  return "No answer";
}

function pendingColumns(
  showLanguage: boolean
): TableColumn<GeoScanPendingAnswer>[] {
  return [
    {
      key: "prompt",
      header: "Prompt",
      width: "1fr",
      minWidth: "14rem",
      cell: (row) => <PromptCell prompt={row.prompt} turn={row.turn ?? null} />,
    },
    {
      key: "engine",
      header: "Model",
      width: "10rem",
      cell: (row) => <ModelCell engine={row.engine} />,
    },
    ...(showLanguage
      ? [
          {
            key: "language",
            header: "Language",
            width: "7rem",
            cell: (row: GeoScanPendingAnswer) => (
              <span className="text-muted-foreground">{row.language}</span>
            ),
          },
        ]
      : []),
    {
      key: "status",
      header: "Status",
      width: "8rem",
      cell: (row) => (
        <span className="text-muted-foreground inline-flex items-center gap-2">
          {row.status === "running" ? (
            <HugeiconsIcon
              aria-hidden="true"
              className="text-primary shrink-0 motion-safe:animate-spin"
              icon={Loading03Icon}
              size={14}
            />
          ) : null}
          {pendingStatusLabel(row.status)}
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

function scanRunEmptyState({
  running,
  isError,
  hasData,
  loading,
  onRetry,
}: GeoScanRunEmptyStateInput): ReactNode {
  if (isError && !hasData) {
    return (
      <span className="flex flex-col items-center gap-2">
        Could not load scan answers.
        <Button onClick={onRetry} size="sm" variant="outline">
          Try again
        </Button>
      </span>
    );
  }
  if (!(loading || hasData)) {
    return "This scan is no longer available.";
  }
  return running
    ? "Waiting for the first answers. They appear here as each batch finishes."
    : "No saved answers for this selection.";
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
  return (
    <Table
      className="rounded-2xl"
      columns={pendingColumns(showLanguage)}
      data={pending}
      emptyState={emptyState}
      footer={
        total > GEO_SCAN_RESULTS_PAGE_SIZE ? (
          <ScanTablePagination
            itemLabel={running ? "in progress" : "missing"}
            offset={offset}
            onOffsetChange={onOffsetChange}
            total={total}
          />
        ) : null
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
  return (
    <Table
      className="rounded-2xl"
      columns={answerColumns(showLanguage)}
      data={results}
      emptyState={emptyState}
      footer={
        total > GEO_SCAN_RESULTS_PAGE_SIZE ? (
          <ScanTablePagination
            itemLabel="answers"
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

function ScanRunFilters({
  view,
  onViewChange,
  answerCount,
  pendingCount,
  running,
  engine,
  engines,
  onEngineChange,
}: GeoScanRunFiltersProps) {
  const showViews = pendingCount > 0;
  const showEngines = engines.length > 1;
  if (!(showViews || showEngines)) {
    return null;
  }
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
      {showViews ? (
        <div
          aria-label="Scan answers"
          className="flex items-center gap-3 text-sm"
          role="group"
        >
          <button
            aria-pressed={view === "answers"}
            className={cn(
              "focus-visible:ring-ring/50 inline-flex items-center gap-1.5 rounded-sm focus-visible:ring-2 focus-visible:outline-none",
              view === "answers"
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => onViewChange("answers")}
            type="button"
          >
            Answers
            <span className="tabular-nums opacity-70">
              {answerCount.toLocaleString()}
            </span>
          </button>
          <button
            aria-pressed={view === "pending"}
            className={cn(
              "focus-visible:ring-ring/50 inline-flex items-center gap-1.5 rounded-sm focus-visible:ring-2 focus-visible:outline-none",
              view === "pending"
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => onViewChange("pending")}
            type="button"
          >
            {running ? "In progress" : "Missing"}
            <span className="tabular-nums opacity-70">
              {pendingCount.toLocaleString()}
            </span>
          </button>
        </div>
      ) : (
        <span />
      )}
      {showEngines ? (
        <Select
          onValueChange={(value) => onEngineChange(value ?? ALL_MODELS)}
          value={engine}
        >
          <SelectTrigger aria-label="Filter scan answers by model" size="sm">
            <SelectValue>
              {engine === ALL_MODELS
                ? "All models"
                : formatEngineFamily(engine)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent align="end" alignItemWithTrigger={false}>
            <SelectItem value={ALL_MODELS}>All models</SelectItem>
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

export function ScanRunDetail({ organizationId, run }: GeoScanRunDetailProps) {
  const [view, setView] = useState<GeoScanRunView>("answers");
  const [pendingOffset, setPendingOffset] = useState(0);
  const [offset, setOffset] = useState(0);
  const [engine, setEngine] = useState(ALL_MODELS);
  const [checkId, setCheckId] = useState<string | null>(null);
  const query = useGeoScanRun(
    organizationId,
    offset,
    engine || undefined,
    pendingOffset,
    run.status === "running"
  );
  const model = scanRunDetailView({
    run,
    view,
    data: query.data,
    isPending: query.isPending,
    pendingOffset,
  });
  const emptyState = scanRunEmptyState({
    running: model.running,
    isError: query.isError,
    hasData: Boolean(query.data),
    loading: model.loading,
    onRetry: () => {
      void query.refetch();
    },
  });
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
        scanId={
          model.results.find((result) => result.id === checkId)?.scanId ??
          run.id
        }
      />
    </div>
  );
}
