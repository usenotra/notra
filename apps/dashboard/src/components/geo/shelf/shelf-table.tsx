"use client";

import { PlusSignIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { LogoStack } from "@notra/ui/components/geo/logo-stack";
import { TruncateWithTooltip } from "@notra/ui/components/shared/truncate-with-tooltip";
import {
  InfiniteDataTable,
  type TableColumn,
} from "@notra/ui/components/ui/data-table";
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
import { useTranslations } from "use-intl";

import { Button } from "@/components/button";
import { EmptyState } from "@/components/empty-state";
import { EmptyStateTablePreview } from "@/components/empty-state-preview";
import { CompetitorLogo } from "@/components/geo/competitor-logo";
import { EngineIcon } from "@/components/geo/engine-icon";
import { ShelfPlacementBadge } from "@/components/geo/shelf/shelf-placement-badge";
import { ShelfTableContextMenu } from "@/components/geo/shelf/shelf-table-context-menu";
import { ShelfTicketAssigneeCard } from "@/components/geo/shelf/shelf-ticket-assignee-card";
import { ShelfTicketBadge } from "@/components/geo/shelf/shelf-ticket-badge";
import {
  EMPTY_STATE_TABLE_COLUMNS,
  EMPTY_STATE_TABLE_ROWS,
} from "@/constants/empty-state";
import {
  GEO_SHELF_COMPETITOR_STACK_LIMIT,
  GEO_SHELF_ENGINE_STACK_LIMIT,
  GEO_SHELF_HOVER_DELAY_MS,
  GEO_SHELF_TABLE_COLUMN,
  GEO_SHELF_TABLE_HEIGHT,
  GEO_SHELF_TABLE_ROW_HEIGHT,
} from "@/constants/geo-shelf";
import { useGeoShelfKindLabels } from "@/lib/hooks/use-geo-shelf-labels";
import { useLogoStackLabels } from "@/lib/i18n/use-logo-stack-labels";
import { cn } from "@/lib/utils";
import type { GeoShelfRow, GeoShelfTableProps } from "@/types/geo-shelf";
import { groupShelfCitationEngines } from "@/utils/geo-shelf";
import { toGeoShelfSortState } from "@/utils/geo-shelf-page";

/** Below `md` the page, citations and presence columns carry the story. */
const MOBILE_HIDDEN_COLUMN_KEYS: readonly string[] = ["competitors"];

function PageCell({ row }: { row: GeoShelfRow }) {
  const t = useTranslations("geo.shelf.shelfTable");
  const kindLabels = useGeoShelfKindLabels();
  const kind = kindLabels[row.kind];
  const subtitle =
    row.origin === "manual" ? t("addedManually", { kind }) : kind;
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
          {subtitle}
        </TruncateWithTooltip>
      </span>
    </span>
  );
}

function CitationsCell({ row }: { row: GeoShelfRow }) {
  const logoStackLabels = useLogoStackLabels();
  const count = row.citations.windowCount;
  const families = groupShelfCitationEngines(row.citations.engines).map(
    ({ family, label, models }) => ({
      key: family,
      label,
      detail: models.join(", "),
      renderIcon: (className: string) => (
        <EngineIcon className={className} engine={models[0] ?? family} />
      ),
    })
  );
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <span
        className={cn(
          "w-8 shrink-0 text-right tabular-nums",
          count === 0 && "text-muted-foreground"
        )}
      >
        {count > 0 ? count : "–"}
      </span>
      {families.length > 0 ? (
        <LogoStack
          labels={logoStackLabels}
          items={families}
          limit={GEO_SHELF_ENGINE_STACK_LIMIT}
        />
      ) : null}
    </span>
  );
}

function CompetitorsCell({
  row,
  competitorCount,
}: {
  row: GeoShelfRow;
  competitorCount: number;
}) {
  const logoStackLabels = useLogoStackLabels();
  const t = useTranslations("geo.shelf.shelfTable");
  const tGeoShared = useTranslations("geo.shared");
  const tStates = useTranslations("common.states");
  if (row.presentCompetitors.length === 0) {
    // Unchecked competitors are not stored, so "none on the page" needs a
    // classified placement for every tracked competitor.
    const checkedCount = row.competitorPlacements.filter(
      (placement) => placement.status !== "unknown"
    ).length;
    const isUnchecked = checkedCount < competitorCount;
    const label = isUnchecked ? tGeoShared("notChecked") : tStates("none");
    const description = isUnchecked
      ? t("competitorsUnchecked")
      : t("competitorsNone");
    return (
      <Tooltip>
        <TooltipTrigger
          aria-label={t("hintLabel", { label, description })}
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
      labels={logoStackLabels}
      items={row.presentCompetitors.map((placement) => ({
        key: placement.competitorId ?? placement.brandName,
        label: placement.brandName,
        detail: placement.position
          ? t("positionOnPage", { position: placement.position })
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
  const t = useTranslations("geo.shelf.shelfTable");
  const tLabels = useTranslations("geo.shelf.labels");
  if (!row.opportunity) {
    return (
      <span className="text-muted-foreground text-xs">
        {tLabels("noTicket")}
      </span>
    );
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
            aria-label={t("assignedTo", { name })}
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
  competitorCount,
}: GeoShelfTableProps) {
  const t = useTranslations("geo.shelf.shelfTable");
  const tGeoShared = useTranslations("geo.shared");
  const tCommon = useTranslations("common");
  const tLabels = useTranslations("geo.shelf.labels");
  const isMobile = useIsMobile();
  const columns: TableColumn<GeoShelfRow>[] = [
    {
      key: "title",
      header: (
        <span className="inline-flex items-center gap-1.5">
          {tGeoShared("page")}
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
      header: tGeoShared("cited"),
      width: GEO_SHELF_TABLE_COLUMN.citations.width,
      sortable: true,
      cell: (row) => <CitationsCell row={row} />,
      sortValue: (row) => row.citations.windowCount,
    },
    {
      key: "own",
      header: tGeoShared("youLabel"),
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
      header: tCommon("labels.competitors"),
      width: GEO_SHELF_TABLE_COLUMN.competitors.width,
      cell: (row) => (
        <CompetitorsCell competitorCount={competitorCount} row={row} />
      ),
      sortValue: (row) => row.presentCompetitors.length,
    },
    {
      key: "ticket",
      header: tLabels("ticket"),
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
            {tGeoShared("addShelf")}
          </Button>
        }
        description={hasScanData ? t("emptyScanned") : t("emptyUnscanned")}
        preview={
          <EmptyStateTablePreview
            columns={EMPTY_STATE_TABLE_COLUMNS.shelf}
            rows={EMPTY_STATE_TABLE_ROWS}
          />
        }
        title={t("emptyTitle")}
      />
    );
  }

  const visibleColumns = isMobile
    ? columns.filter(
        (column) => !MOBILE_HIDDEN_COLUMN_KEYS.includes(column.key)
      )
    : columns;

  return (
    <InfiniteDataTable
      columns={visibleColumns}
      data={rows}
      emptyState={tLabels("noMatches")}
      getRowId={(row) => row.id}
      height={GEO_SHELF_TABLE_HEIGHT}
      isRowPinned={(row) => pendingSourceIds.has(row.id)}
      loading={isFetchingNextPage}
      loadingMore={isFetchingNextPage}
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
