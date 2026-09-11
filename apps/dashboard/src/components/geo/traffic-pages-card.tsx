"use client";

import { SearchIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  GEO_TRAFFIC_PAGES_PAGE_PARAM,
  GEO_TRAFFIC_PAGES_PATH_PARAM,
} from "@notra/geo-core/constants/geo";
import {
  formatGeoSource,
  trafficVisitDelta,
} from "@notra/geo-core/utils/ai-traffic";
import { TablePagination } from "@notra/ui/components/shared/table-pagination";
import { TruncateWithTooltip } from "@notra/ui/components/shared/truncate-with-tooltip";
import { Input } from "@notra/ui/components/ui/input";
import { parseAsString, useQueryState } from "nuqs";
import type { ReactNode } from "react";

import { GeoStatDelta } from "@/components/geo/geo-stat-delta";
import { GeoTableSkeleton } from "@/components/geo/skeleton-parts";
import { TrafficPageSourcesCell } from "@/components/geo/traffic-page-sources-cell";
import {
  InstrumentEmpty,
  InstrumentSection,
} from "@/components/instrument/instrument-module";
import { Table, type TableColumn } from "@/components/motion/table";
import { TABLE_ROW_HEIGHT } from "@/constants/table";
import { useTablePagination } from "@/lib/hooks/use-table-pagination";
import type { GeoTrafficPageGroup, TrafficPagesCardProps } from "@/types/geo";
import {
  filterTrafficPageGroups,
  groupTrafficPages,
} from "@/utils/ai-traffic-pages";
import { paginatedTableHeightFor } from "@/utils/table";

const PAGE_SKELETON_ROWS = 4;
const PAGE_COLUMN_WIDTH = "32rem";
const SOURCE_COLUMN_WIDTH = "1fr";
const VISITS_COLUMN_WIDTH = "9.5rem";

export function TrafficPagesCard({
  pages,
  isPending = false,
}: TrafficPagesCardProps) {
  const [pathQuery, setPathQuery] = useQueryState(
    GEO_TRAFFIC_PAGES_PATH_PARAM,
    parseAsString.withDefault("").withOptions({ clearOnDefault: true })
  );
  const groups = groupTrafficPages(pages);
  const filteredGroups = filterTrafficPageGroups(groups, pathQuery);
  const pagination = useTablePagination({
    key: GEO_TRAFFIC_PAGES_PAGE_PARAM,
    totalItems: filteredGroups.length,
    isReady: !isPending,
  });
  const handlePathQueryChange = (value: string) => {
    pagination.setPage(1);
    setPathQuery(value);
  };
  const columns: TableColumn<GeoTrafficPageGroup>[] = [
    {
      key: "path",
      header: "Page",
      width: PAGE_COLUMN_WIDTH,
      sortable: true,
      cell: (row) => (
        <TruncateWithTooltip className="font-mono text-xs">
          {row.path}
        </TruncateWithTooltip>
      ),
    },
    {
      key: "sources",
      header: "Sources",
      width: SOURCE_COLUMN_WIDTH,
      sortable: true,
      cell: (row) => <TrafficPageSourcesCell group={row} />,
      sortValue: (row) =>
        row.sources.length === 1 && row.sources[0]
          ? formatGeoSource(row.sources[0].source)
          : `~${String(row.sources.length).padStart(3, "0")}`,
    },
    {
      key: "visits",
      header: "Visits",
      width: VISITS_COLUMN_WIDTH,
      align: "right",
      sortable: true,
      cell: (row) => {
        const delta =
          row.previousVisits === undefined
            ? null
            : trafficVisitDelta(row.visits, row.previousVisits);

        return (
          <span className="flex items-center justify-end gap-2">
            <span className="text-sm tabular-nums">
              {row.visits.toLocaleString()}
            </span>
            <GeoStatDelta delta={delta} />
          </span>
        );
      },
    },
  ];

  let body: ReactNode;
  if (isPending) {
    body = <GeoTableSkeleton rows={PAGE_SKELETON_ROWS} />;
  } else if (groups.length === 0) {
    body = (
      <InstrumentEmpty
        message="No AI visits captured yet"
        seed="geo-traffic-pages"
      />
    );
  } else {
    body = (
      <div className="flex flex-col gap-2">
        <div className="relative max-w-xs">
          <HugeiconsIcon
            className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2"
            icon={SearchIcon}
            size={15}
          />
          <Input
            aria-label="Filter pages by path"
            className="pl-9"
            onChange={(event) => handlePathQueryChange(event.target.value)}
            placeholder="Filter by path..."
            value={pathQuery}
          />
        </div>
        {filteredGroups.length === 0 ? (
          <InstrumentEmpty
            message="No pages match this filter"
            seed="geo-traffic-pages-filter"
          />
        ) : (
          <Table
            className="rounded-2xl"
            columns={columns}
            data={filteredGroups}
            defaultSort={{ key: "visits", direction: "desc" }}
            emptyState="No pages match this filter"
            footer={<TablePagination {...pagination} itemLabel="pages" />}
            getRowId={(row) => row.path}
            height={paginatedTableHeightFor(pagination.pageRowCount)}
            onSortChange={() => pagination.setPage(1)}
            page={pagination.page}
            pageSize={pagination.pageSize}
            resizable
            rowHeight={TABLE_ROW_HEIGHT}
          />
        )}
      </div>
    );
  }

  return (
    <InstrumentSection
      eyebrow={
        groups.length > 0
          ? `Top pages by AI source (${groups.length.toLocaleString()})`
          : "Top pages by AI source"
      }
    >
      {body}
    </InstrumentSection>
  );
}
