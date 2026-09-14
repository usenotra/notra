"use client";

import { PlusSignIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { engineFamilyLabel } from "@notra/geo-core/utils/geo-engine-family";
import { LogoStack } from "@notra/ui/components/geo/logo-stack";
import { TruncateWithTooltip } from "@notra/ui/components/shared/truncate-with-tooltip";
import {
  HoverCard,
  HoverCardTrigger,
} from "@notra/ui/components/ui/hover-card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import { useIsMobile } from "@notra/ui/hooks/use-mobile";

import { Button } from "@/components/button";
import { EmptyState } from "@/components/empty-state";
import { EmptyStateTablePreview } from "@/components/empty-state-preview";
import { CompetitorLogo } from "@/components/geo/competitor-logo";
import { EngineIcon } from "@/components/geo/engine-icon";
import { ShelfPlacementBadge } from "@/components/geo/shelf/shelf-placement-badge";
import { ShelfTableContextMenu } from "@/components/geo/shelf/shelf-table-context-menu";
import { ShelfTicketAssigneeCard } from "@/components/geo/shelf/shelf-ticket-assignee-card";
import { ShelfTicketBadge } from "@/components/geo/shelf/shelf-ticket-badge";
import { Table, type TableColumn } from "@/components/motion/table";
import {
  EMPTY_STATE_TABLE_COLUMNS,
  EMPTY_STATE_TABLE_ROWS,
} from "@/constants/empty-state";
import {
  GEO_SHELF_ADD_LABEL,
  GEO_SHELF_COMPETITORS_NONE_HINT,
  GEO_SHELF_COMPETITORS_UNCHECKED_HINT,
  GEO_SHELF_COMPETITOR_STACK_LIMIT,
  GEO_SHELF_EMPTY_SCANNED_DESCRIPTION,
  GEO_SHELF_EMPTY_TITLE,
  GEO_SHELF_EMPTY_UNSCANNED_DESCRIPTION,
  GEO_SHELF_ENGINE_STACK_LIMIT,
  GEO_SHELF_HOVER_DELAY_MS,
  GEO_SHELF_NO_MATCHES_MESSAGE,
  GEO_SHELF_PLACEMENT_LABELS,
  GEO_SHELF_SOURCE_KIND_LABELS,
  GEO_SHELF_TABLE_COLUMN,
  GEO_SHELF_TABLE_HEIGHT,
  GEO_SHELF_TABLE_ROW_HEIGHT,
} from "@/constants/geo-shelf";
import { cn } from "@/lib/utils";
import type { GeoShelfRow, GeoShelfTableProps } from "@/types/geo-shelf";
import { toGeoShelfSortState } from "@/utils/geo-shelf-page";

/** Below `md` the page, citations and presence columns carry the story. */
const MOBILE_HIDDEN_COLUMN_KEYS: readonly string[] = ["competitors"];

function pageSubtitle(row: GeoShelfRow): string {
  const kind = GEO_SHELF_SOURCE_KIND_LABELS[row.kind];
  const base = `${kind} · ${row.domain}`;
  return row.origin === "manual" ? `${base} · added manually` : base;
}

function PageCell({ row }: { row: GeoShelfRow }) {
  const title = row.title ?? row.url;
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <CompetitorLogo
        className="size-6 shrink-0 rounded-md"
        domain={row.domain}
        name={row.domain}
      />
      <span className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TruncateWithTooltip className="font-medium">
          {title}
        </TruncateWithTooltip>
        <TruncateWithTooltip className="text-muted-foreground text-xs">
          {pageSubtitle(row)}
        </TruncateWithTooltip>
      </span>
    </span>
  );
}

function CitationsCell({ row }: { row: GeoShelfRow }) {
  const count = row.citations.windowCount;
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span className="tabular-nums">{count > 0 ? count : "-"}</span>
      {row.citations.engines.length > 0 ? (
        <LogoStack
          items={row.citations.engines.map((engine) => ({
            key: engine,
            label: engineFamilyLabel(engine),
            detail: engine,
            renderIcon: (className) => (
              <EngineIcon className={className} engine={engine} />
            ),
          }))}
          limit={GEO_SHELF_ENGINE_STACK_LIMIT}
        />
      ) : null}
    </span>
  );
}

function CompetitorsCell({ row }: { row: GeoShelfRow }) {
  if (row.presentCompetitors.length === 0) {
    const unknownCount = row.competitorPlacements.filter(
      (placement) => placement.status === "unknown"
    ).length;
    const isUnchecked = unknownCount > 0;
    const label = isUnchecked ? GEO_SHELF_PLACEMENT_LABELS.unknown : "None";
    const description = isUnchecked
      ? GEO_SHELF_COMPETITORS_UNCHECKED_HINT
      : GEO_SHELF_COMPETITORS_NONE_HINT;
    return (
      <Tooltip>
        <TooltipTrigger
          aria-label={`${label}. ${description}`}
          className="text-muted-foreground inline-flex cursor-help rounded-sm border-0 bg-transparent p-0 text-xs focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          {label}
        </TooltipTrigger>
        <TooltipContent className="max-w-xs text-pretty">
          <span className="block font-medium">{label}</span>
          {description}
        </TooltipContent>
      </Tooltip>
    );
  }
  return (
    <LogoStack
      items={row.presentCompetitors.map((placement) => ({
        key: placement.competitorId ?? placement.brandName,
        label: placement.brandName,
        detail: placement.position
          ? `#${placement.position} on the page`
          : null,
        renderIcon: (className) => (
          <CompetitorLogo
            className={cn(className, "rounded-md")}
            domain={placement.brandDomain}
            name={placement.brandName}
          />
        ),
      }))}
      limit={GEO_SHELF_COMPETITOR_STACK_LIMIT}
    />
  );
}

function TicketCell({ row }: { row: GeoShelfRow }) {
  if (!row.opportunity) {
    return <span className="text-muted-foreground text-xs">No ticket</span>;
  }
  const badge = (
    <ShelfTicketBadge className="shrink-0" status={row.opportunity.status} />
  );
  if (!row.assignee) {
    return badge;
  }
  const name = row.assignee.name || row.assignee.email;
  return (
    <HoverCard>
      <HoverCardTrigger
        delay={GEO_SHELF_HOVER_DELAY_MS}
        render={
          <button
            aria-label={`Assigned to ${name}, show details`}
            className="focus-visible:ring-ring/50 inline-flex cursor-default rounded-sm outline-hidden focus-visible:ring-[3px]"
            type="button"
          />
        }
      >
        {badge}
      </HoverCardTrigger>
      <ShelfTicketAssigneeCard
        member={row.assignee}
        ticketCreatedAt={row.opportunity.createdAt}
        status={row.opportunity.status}
      />
    </HoverCard>
  );
}

export function ShelfTable({
  rows,
  totalCount,
  filteredCount,
  sort,
  onSortChange,
  hasNextPage,
  isFetching,
  isFetchingNextPage,
  onLoadMore,
  currentMemberId,
  onRowClick,
  onUpdateOpportunity,
  onSetPlacementStatus,
  pendingSourceIds,
  hasScanData,
  onAddShelf,
}: GeoShelfTableProps) {
  const isMobile = useIsMobile();
  const columns: TableColumn<GeoShelfRow>[] = [
    {
      key: "title",
      header: (
        <span className="inline-flex items-center gap-1.5">
          Page
          <span className="text-muted-foreground font-normal tabular-nums">
            ({filteredCount})
          </span>
        </span>
      ),
      sortable: true,
      width: GEO_SHELF_TABLE_COLUMN.title.width,
      minWidth: GEO_SHELF_TABLE_COLUMN.title.minWidth,
      cell: (row) => <PageCell row={row} />,
      sortValue: (row) => row.title ?? row.url,
    },
    {
      key: "citations",
      header: "Cited",
      width: GEO_SHELF_TABLE_COLUMN.citations.width,
      sortable: true,
      cell: (row) => <CitationsCell row={row} />,
      sortValue: (row) => row.citations.windowCount,
    },
    {
      key: "own",
      header: "You",
      width: GEO_SHELF_TABLE_COLUMN.own.width,
      sortable: true,
      cell: (row) => (
        <ShelfPlacementBadge
          evidence={row.ownPlacement?.evidence}
          status={row.ownPlacement?.status ?? null}
        />
      ),
      sortValue: (row) => row.ownPlacement?.status ?? "unknown",
    },
    {
      key: "competitors",
      header: "Competitors",
      width: GEO_SHELF_TABLE_COLUMN.competitors.width,
      cell: (row) => <CompetitorsCell row={row} />,
      sortValue: (row) => row.presentCompetitors.length,
    },
    {
      key: "ticket",
      header: "Ticket",
      width: GEO_SHELF_TABLE_COLUMN.ticket.width,
      sortable: true,
      cell: (row) => <TicketCell row={row} />,
      sortValue: (row) => row.opportunity?.status ?? "zz",
    },
  ];

  if (totalCount === 0) {
    return (
      <EmptyState
        action={
          <Button className="gap-1.5" onClick={onAddShelf}>
            <HugeiconsIcon className="size-4" icon={PlusSignIcon} />
            {GEO_SHELF_ADD_LABEL}
          </Button>
        }
        description={
          hasScanData
            ? GEO_SHELF_EMPTY_SCANNED_DESCRIPTION
            : GEO_SHELF_EMPTY_UNSCANNED_DESCRIPTION
        }
        preview={
          <EmptyStateTablePreview
            columns={EMPTY_STATE_TABLE_COLUMNS.shelf}
            rows={EMPTY_STATE_TABLE_ROWS}
          />
        }
        title={GEO_SHELF_EMPTY_TITLE}
      />
    );
  }

  const visibleColumns = isMobile
    ? columns.filter(
        (column) => !MOBILE_HIDDEN_COLUMN_KEYS.includes(column.key)
      )
    : columns;

  return (
    <Table
      className="rounded-2xl"
      columns={visibleColumns}
      data={rows}
      emptyState={GEO_SHELF_NO_MATCHES_MESSAGE}
      getRowId={(row) => row.id}
      height={GEO_SHELF_TABLE_HEIGHT}
      isRowPinned={(row) => pendingSourceIds.has(row.id)}
      loading={isFetchingNextPage}
      manualSort
      // The table only re-arms end-of-list after `loading` settles, so it must
      // not fire during a filter or refetch that `loadMore` would ignore.
      onEndReached={hasNextPage && !isFetching ? onLoadMore : undefined}
      onRowClick={onRowClick}
      onSortChange={(next) => onSortChange(toGeoShelfSortState(next))}
      renderRowContextMenu={(row) => (
        <ShelfTableContextMenu
          currentMemberId={currentMemberId}
          disabled={pendingSourceIds.has(row.id)}
          onOpenDetails={onRowClick}
          onSetPlacementStatus={onSetPlacementStatus}
          onUpdateOpportunity={onUpdateOpportunity}
          row={row}
        />
      )}
      resizable
      rowHeight={GEO_SHELF_TABLE_ROW_HEIGHT}
      sort={sort}
    />
  );
}
