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
  PermissionOption,
  PermissionRow,
} from "@notra/ui/components/ui/permission-selector";
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
import type {
  GeoScanModelCellProps,
  GeoScanPendingAnswer,
  GeoScanPromptCellProps,
  GeoScanRunDetailProps,
  GeoScanRunFiltersProps,
  GeoScanRunView,
  GeoScanTablePaginationProps,
} from "@/types/geo-scan-activity";
import { formatEngineWithMode } from "@/utils/geo-charts";
import { paginatedTableHeightFor } from "@/utils/table";

const ALL_MODELS = "";

function ModelCell({ engine }: GeoScanModelCellProps) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <EngineIcon className="size-3.5 shrink-0" engine={engine} />
      <TruncateWithTooltip>{formatEngineWithMode(engine)}</TruncateWithTooltip>
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
      width: "12.5rem",
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
      width: "9.5rem",
      cell: (row) => (
        <Badge variant={row.mentioned ? "success" : "secondary"}>
          <HugeiconsIcon
            aria-hidden="true"
            icon={row.mentioned ? Tick02Icon : MinusSignIcon}
          />
          {row.mentioned ? "Mentioned" : "Not mentioned"}
        </Badge>
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
    return "Generating answer…";
  }
  if (status === "queued") {
    return "Queued";
  }
  return "No answer saved";
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
      width: "12.5rem",
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
    <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
      {showViews ? (
        <PermissionRow
          className="w-fit shrink-0"
          label="Scan answers"
          layout="compact"
          onValueChange={(value) => {
            if (value === "answers" || value === "pending") {
              onViewChange(value);
            }
          }}
          value={view}
        >
          <PermissionOption value="answers">
            Answers
            <span className="text-xs tabular-nums opacity-70">
              {answerCount.toLocaleString()}
            </span>
          </PermissionOption>
          <PermissionOption value="pending">
            {running ? "In progress" : "Missing"}
            <span className="text-xs tabular-nums opacity-70">
              {pendingCount.toLocaleString()}
            </span>
          </PermissionOption>
        </PermissionRow>
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
                : formatEngineWithMode(engine)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent align="end" alignItemWithTrigger={false}>
            <SelectItem value={ALL_MODELS}>All models</SelectItem>
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
  const { data } = query;
  const running = run.status === "running";
  const pendingTotal = data?.pendingTotal ?? 0;
  // Fall back to answers once every pending task has been saved.
  const activeView = pendingTotal > 0 ? view : "answers";
  const showLanguage = (run.plan?.languages.length ?? 0) > 1;
  const loading = query.isPending || query.isPlaceholderData;

  const hasFilters = pendingTotal > 0 || (run.plan?.engines.length ?? 0) > 1;
  const toolbar = hasFilters ? (
    <ScanRunFilters
      answerCount={data?.total ?? run.checks}
      engine={engine}
      engines={run.plan?.engines ?? []}
      onEngineChange={(next) => {
        setEngine(next);
        setOffset(0);
        setPendingOffset(0);
      }}
      onViewChange={setView}
      pendingCount={pendingTotal}
      running={running}
      view={activeView}
    />
  ) : undefined;

  let emptyState: ReactNode = running
    ? "Waiting for the first answers. They appear here as each batch finishes."
    : "No saved answers for this selection.";
  if (query.isError && !data) {
    emptyState = (
      <span className="flex flex-col items-center gap-2">
        Could not load scan answers.
        <Button
          onClick={() => {
            void query.refetch();
          }}
          size="sm"
          variant="outline"
        >
          Try again
        </Button>
      </span>
    );
  } else if (!(loading || data)) {
    emptyState = "This scan is no longer available.";
  }

  const pending = data?.pending ?? [];
  const results = data?.results ?? [];
  const rowCount = activeView === "pending" ? pending.length : results.length;
  const height = paginatedTableHeightFor(
    loading ? GEO_SCAN_RESULTS_PAGE_SIZE / 2 : rowCount
  );

  return (
    <div aria-busy={query.isPlaceholderData || loading} className="min-w-0">
      {activeView === "pending" ? (
        <Table
          className="rounded-2xl"
          columns={pendingColumns(showLanguage)}
          data={pending}
          emptyState={emptyState}
          footer={
            <ScanTablePagination
              itemLabel={running ? "in progress" : "missing"}
              offset={data?.pendingOffset ?? pendingOffset}
              onOffsetChange={setPendingOffset}
              total={pendingTotal}
            />
          }
          getRowId={(row) => row.key}
          height={height}
          loading={loading}
          rowHeight={TABLE_ROW_HEIGHT}
          toolbar={toolbar}
        />
      ) : (
        <Table
          className="rounded-2xl"
          columns={answerColumns(showLanguage)}
          data={results}
          emptyState={emptyState}
          footer={
            data && data.total > 0 ? (
              <ScanTablePagination
                itemLabel="answers"
                offset={offset}
                onOffsetChange={setOffset}
                total={data.total}
              />
            ) : null
          }
          getRowId={(row) => row.id}
          height={height}
          loading={loading}
          onRowClick={(row) => setCheckId(row.id)}
          rowHeight={TABLE_ROW_HEIGHT}
          skeletonRows={GEO_SCAN_RESULTS_PAGE_SIZE / 2}
          toolbar={toolbar}
        />
      )}
      <ScanAnswerSheet
        checkId={checkId}
        initialLanguage={
          results.find((result) => result.id === checkId)?.language
        }
        key={checkId}
        onClose={() => setCheckId(null)}
        organizationId={organizationId}
        scanId={run.id}
      />
    </div>
  );
}
