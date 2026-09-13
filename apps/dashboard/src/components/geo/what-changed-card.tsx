"use client";

import {
  ArrowDown01Icon,
  ArrowRight01Icon,
  ArrowUp01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  GEO_CHANGE_KIND_LABELS,
  GEO_CHANGE_KIND_ORDER,
  GEO_CHANGES_CITATIONS_ADDED_PREFIX,
  GEO_CHANGES_CITATIONS_REMOVED_PREFIX,
  GEO_CHANGES_COLUMN_LABELS,
  GEO_CHANGES_EMPTY_DETAIL,
  GEO_CHANGES_EMPTY_NEEDS_SCANS,
  GEO_CHANGES_EMPTY_NO_CHANGES,
  GEO_CHANGES_ITEM_LABEL,
  GEO_CHANGES_LABEL,
  GEO_CHANGES_PAGE_KEY,
  GEO_CHANGES_SKELETON_ROWS,
  GEO_CHANGES_SUMMARY_GROUPS,
  GEO_CHANGES_SUMMARY_HINTS,
  GEO_CHANGES_SUMMARY_LABELS,
  GEO_EMPTY_COMPETITORS,
  GEO_EMPTY_PROMPT_RESULTS,
  GEO_GAPS_COMPETITOR_DETAIL,
} from "@notra/geo-core/constants/geo";
import { findCompetitor } from "@notra/geo-core/geo/domain";
import type { GeoChangeEvent, GeoCompetitor } from "@notra/geo-core/types/geo";
import { geoScanEmptyMessage } from "@notra/geo-core/utils/geo-scan";
import { LogoStack } from "@notra/ui/components/geo/logo-stack";
import { TablePagination } from "@notra/ui/components/shared/table-pagination";
import { TruncateWithTooltip } from "@notra/ui/components/shared/truncate-with-tooltip";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { EmptyStateTablePreview } from "@/components/empty-state-preview";
import { CompetitorLogo } from "@/components/geo/competitor-logo";
import { EngineIcon } from "@/components/geo/engine-icon";
import { PromptDetailDialog } from "@/components/geo/prompt-detail-dialog";
import { GeoTableSkeleton } from "@/components/geo/skeleton-parts";
import {
  InstrumentEmpty,
  InstrumentSection,
} from "@/components/instrument/instrument-module";
import { Table, type TableColumn } from "@/components/motion/table";
import { useGeoProjectScope } from "@/components/providers/geo-project-provider";
import { EMPTY_STATE_TABLE_COLUMNS } from "@/constants/empty-state";
import {
  GEO_CHANGE_ICON_SIZE,
  GEO_CHANGE_KIND_ICONS,
  GEO_CHANGE_KIND_TONE_CLASSES,
} from "@/constants/geo-change-icons";
import { TABLE_ROW_HEIGHT } from "@/constants/table";
import { useGeoChanges } from "@/lib/hooks/use-geo";
import { useTablePagination } from "@/lib/hooks/use-table-pagination";
import { cn } from "@/lib/utils";
import type {
  GeoChangeCellProps,
  GeoChangeCompetitorsCellProps,
  GeoChangeSummaryGroupProps,
  GeoChangeSummaryStatProps,
  GeoChangesSummaryRowProps,
  WhatChangedCardProps,
} from "@/types/geo";
import {
  describeGeoChangeDetail,
  geoChangeEngineLabel,
  geoChangePositionSortValue,
  geoChangesSubline,
} from "@/utils/geo-changes";
import { withGeoProject } from "@/utils/geo-paths";
import { promptTableRowForId } from "@/utils/geo-prompts";
import { paginatedTableHeightFor } from "@/utils/table";

const STAT_ICON_SIZE = 10;
const STAT_ICON_STROKE = 2.5;
const POSITION_ARROW_SIZE = 12;
const DOMAIN_ICON_SIZE = 14;

const STAT_TONE_CLASS = {
  up: "bg-geo-up/10 text-geo-up",
  down: "bg-geo-down/10 text-geo-down",
} as const;

const STAT_ICON = {
  up: ArrowUp01Icon,
  down: ArrowDown01Icon,
} as const;

const CHANGES_DEFAULT_SORT = { key: "change", direction: "asc" } as const;

function SummaryStat({
  direction,
  label,
  hint,
  value,
}: GeoChangeSummaryStatProps) {
  const isZero = value === 0;
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            className={cn(
              "inline-flex cursor-default items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[0.6875rem] leading-none font-medium tabular-nums",
              isZero
                ? "bg-muted text-muted-foreground"
                : STAT_TONE_CLASS[direction]
            )}
          />
        }
      >
        <HugeiconsIcon
          aria-hidden="true"
          icon={STAT_ICON[direction]}
          size={STAT_ICON_SIZE}
          strokeWidth={STAT_ICON_STROKE}
        />
        <span className="sr-only">{label} </span>
        {value.toLocaleString()}
      </TooltipTrigger>
      <TooltipContent className="max-w-56 text-pretty">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground block">{hint}</span>
      </TooltipContent>
    </Tooltip>
  );
}

function SummaryGroup({ group, summary }: GeoChangeSummaryGroupProps) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-muted-foreground mr-0.5 text-xs">
        {group.label}
      </span>
      <SummaryStat
        direction="up"
        hint={GEO_CHANGES_SUMMARY_HINTS[group.up]}
        label={GEO_CHANGES_SUMMARY_LABELS[group.up]}
        value={summary[group.up]}
      />
      <SummaryStat
        direction="down"
        hint={GEO_CHANGES_SUMMARY_HINTS[group.down]}
        label={GEO_CHANGES_SUMMARY_LABELS[group.down]}
        value={summary[group.down]}
      />
    </div>
  );
}

function SummaryToolbar({ summary }: GeoChangesSummaryRowProps) {
  return (
    <div className="flex min-h-11 flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2">
      {GEO_CHANGES_SUMMARY_GROUPS.map((group, index) => (
        <div className="flex items-center gap-4" key={group.key}>
          {index > 0 ? (
            <span aria-hidden="true" className="bg-border h-3 w-px" />
          ) : null}
          <SummaryGroup group={group} summary={summary} />
        </div>
      ))}
    </div>
  );
}

function ChangeCell({ event }: GeoChangeCellProps) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span
        className={cn(
          "flex size-4 shrink-0 items-center justify-center",
          GEO_CHANGE_KIND_TONE_CLASSES[event.kind]
        )}
      >
        <HugeiconsIcon
          icon={GEO_CHANGE_KIND_ICONS[event.kind]}
          size={GEO_CHANGE_ICON_SIZE}
        />
      </span>
      <span className="truncate font-medium">
        {GEO_CHANGE_KIND_LABELS[event.kind]}
      </span>
    </span>
  );
}

function EngineCell({ event }: GeoChangeCellProps) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span className="flex size-4 shrink-0 items-center justify-center">
        <EngineIcon engine={event.engine} />
      </span>
      <span className="truncate">{geoChangeEngineLabel(event.engine)}</span>
    </span>
  );
}

function PositionCell({ event }: GeoChangeCellProps) {
  const detail = describeGeoChangeDetail(event);
  const isUnchanged = detail.before === detail.after;

  if (isUnchanged) {
    return (
      <span className="text-muted-foreground whitespace-nowrap tabular-nums">
        {detail.after}
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1.5 whitespace-nowrap tabular-nums">
      <span className="text-muted-foreground">{detail.before}</span>
      <HugeiconsIcon
        aria-hidden="true"
        className="text-muted-foreground/60 shrink-0"
        icon={ArrowRight01Icon}
        size={POSITION_ARROW_SIZE}
      />
      <span>{detail.after}</span>
    </span>
  );
}

function CompetitorLogosCell({
  event,
  competitors,
}: GeoChangeCompetitorsCellProps) {
  const items = event.competitors.map((name) => {
    const competitor = findCompetitor(competitors, name);
    return {
      key: name,
      label: name,
      detail: competitor
        ? GEO_GAPS_COMPETITOR_DETAIL.tracked
        : GEO_GAPS_COMPETITOR_DETAIL.discovered,
      renderIcon: (className: string) => (
        <CompetitorLogo
          className={className}
          domain={competitor?.domain ?? null}
          name={name}
        />
      ),
    };
  });
  return <LogoStack items={items} />;
}

function DomainsCell({ event }: GeoChangeCellProps) {
  const isRemoved = event.kind === "citation_removed";
  const label = isRemoved
    ? GEO_CHANGES_CITATIONS_REMOVED_PREFIX
    : GEO_CHANGES_CITATIONS_ADDED_PREFIX;
  const [first, ...rest] = event.domains;

  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <Tooltip>
        <TooltipTrigger
          aria-label={label}
          render={
            <span
              className={cn(
                "flex size-4 shrink-0 cursor-default items-center justify-center",
                GEO_CHANGE_KIND_TONE_CLASSES[event.kind]
              )}
            />
          }
        >
          <HugeiconsIcon
            icon={GEO_CHANGE_KIND_ICONS[event.kind]}
            size={DOMAIN_ICON_SIZE}
          />
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
      <TruncateWithTooltip className="text-muted-foreground text-xs">
        {first ?? ""}
      </TruncateWithTooltip>
      {rest.length > 0 ? (
        <Tooltip>
          <TooltipTrigger
            aria-label={`${label}: ${event.domains.join(", ")}`}
            render={
              <span className="text-muted-foreground shrink-0 cursor-default text-xs tabular-nums" />
            }
          >
            +{rest.length}
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <span className="block font-medium">{label}</span>
            <span className="text-muted-foreground block text-pretty">
              {event.domains.join(", ")}
            </span>
          </TooltipContent>
        </Tooltip>
      ) : null}
    </span>
  );
}

function DetailCell({ event, competitors }: GeoChangeCompetitorsCellProps) {
  if (event.competitors.length > 0) {
    return <CompetitorLogosCell competitors={competitors} event={event} />;
  }
  if (event.domains.length > 0) {
    return <DomainsCell event={event} />;
  }
  return (
    <span className="text-muted-foreground text-xs">
      {GEO_CHANGES_EMPTY_DETAIL}
    </span>
  );
}

function changeColumnsFor(
  competitors: readonly GeoCompetitor[]
): TableColumn<GeoChangeEvent>[] {
  return [
    {
      key: "change",
      header: GEO_CHANGES_COLUMN_LABELS.change,
      width: "14rem",
      sortable: true,
      cell: (row) => <ChangeCell event={row} />,
      sortValue: (row) => GEO_CHANGE_KIND_ORDER[row.kind],
    },
    {
      key: "engine",
      header: GEO_CHANGES_COLUMN_LABELS.engine,
      width: "8.5rem",
      sortable: true,
      cell: (row) => <EngineCell event={row} />,
      sortValue: (row) => geoChangeEngineLabel(row.engine),
    },
    {
      key: "prompt",
      header: GEO_CHANGES_COLUMN_LABELS.prompt,
      width: "1.4fr",
      sortable: true,
      cell: (row) => (
        <TruncateWithTooltip className="text-sm">
          {row.prompt}
        </TruncateWithTooltip>
      ),
    },
    {
      key: "position",
      header: GEO_CHANGES_COLUMN_LABELS.position,
      width: "14rem",
      sortable: true,
      cell: (row) => <PositionCell event={row} />,
      sortValue: geoChangePositionSortValue,
    },
    {
      key: "detail",
      header: GEO_CHANGES_COLUMN_LABELS.detail,
      width: "1fr",
      cell: (row) => <DetailCell competitors={competitors} event={row} />,
    },
  ];
}

function changeRowId(event: GeoChangeEvent): string {
  return `${event.kind}-${event.promptId}-${event.engine}`;
}

export function WhatChangedCard({
  organizationId,
  organizationSlug,
  promptResults = GEO_EMPTY_PROMPT_RESULTS,
  competitors = GEO_EMPTY_COMPETITORS,
  isScanning = false,
}: WhatChangedCardProps) {
  const { projectId } = useGeoProjectScope();
  const router = useRouter();
  const { data, isPending } = useGeoChanges(organizationId);
  const [detail, setDetail] = useState<{
    promptId: string;
    engine: string;
  } | null>(null);
  const detailRow = detail
    ? promptTableRowForId(detail.promptId, promptResults)
    : null;

  const events = data?.events ?? [];
  const columns = changeColumnsFor(competitors);
  const pagination = useTablePagination({
    key: GEO_CHANGES_PAGE_KEY,
    totalItems: events.length,
    isReady: !isPending,
  });

  function openEvent(event: GeoChangeEvent) {
    if (promptTableRowForId(event.promptId, promptResults)) {
      setDetail({ promptId: event.promptId, engine: event.engine });
      return;
    }
    router.push(
      withGeoProject(
        `/${organizationSlug}/geo/prompts?q=${encodeURIComponent(event.prompt)}`,
        projectId
      )
    );
  }

  let body = <GeoTableSkeleton rows={GEO_CHANGES_SKELETON_ROWS} />;
  if (!isPending && data) {
    if (!data.previousScan) {
      body = (
        <InstrumentEmpty
          busy={isScanning}
          className="h-40"
          message={geoScanEmptyMessage(
            isScanning,
            GEO_CHANGES_EMPTY_NEEDS_SCANS
          )}
          preview={
            <div className="px-6 pt-2">
              <EmptyStateTablePreview
                columns={EMPTY_STATE_TABLE_COLUMNS.changes}
                rows={3}
              />
            </div>
          }
          seed={GEO_CHANGES_LABEL}
        />
      );
    } else if (events.length === 0) {
      body = (
        <InstrumentEmpty
          busy={isScanning}
          className="h-40"
          message={geoScanEmptyMessage(
            isScanning,
            GEO_CHANGES_EMPTY_NO_CHANGES
          )}
          preview={
            <div className="px-6 pt-2">
              <EmptyStateTablePreview
                columns={EMPTY_STATE_TABLE_COLUMNS.changes}
                rows={3}
              />
            </div>
          }
          seed={GEO_CHANGES_LABEL}
        />
      );
    } else {
      body = (
        <Table
          className="rounded-2xl"
          columns={columns}
          data={events}
          defaultSort={CHANGES_DEFAULT_SORT}
          footer={
            <TablePagination
              {...pagination}
              itemLabel={GEO_CHANGES_ITEM_LABEL}
            />
          }
          getRowId={changeRowId}
          height={paginatedTableHeightFor(pagination.pageRowCount)}
          onRowClick={openEvent}
          onSortChange={() => pagination.setPage(1)}
          page={pagination.page}
          pageSize={pagination.pageSize}
          resizable
          rowHeight={TABLE_ROW_HEIGHT}
          toolbar={<SummaryToolbar summary={data.summary} />}
        />
      );
    }
  }

  return (
    <>
      <InstrumentSection
        description={geoChangesSubline(
          data?.currentScan?.finishedAt,
          isScanning
        )}
        eyebrow={GEO_CHANGES_LABEL}
      >
        {body}
      </InstrumentSection>
      <PromptDetailDialog
        initialEngine={detail?.engine}
        isScanning={isScanning}
        onOpenChange={(open) => {
          if (!open) {
            setDetail(null);
          }
        }}
        open={detailRow !== null}
        row={detailRow}
      />
    </>
  );
}
