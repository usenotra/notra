"use client";

import { SearchIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  GEO_TRAFFIC_HOST_ALL,
  GEO_TRAFFIC_PAGES_PATH_PARAM,
} from "@notra/geo-core/constants/geo";
import {
  formatGeoSource,
  trafficVisitDelta,
} from "@notra/geo-core/utils/ai-traffic";
import {
  formatTrafficLocation,
  trafficLogHostFilter,
} from "@notra/geo-core/utils/geo-project-domains";
import { TruncateWithTooltip } from "@notra/ui/components/shared/truncate-with-tooltip";
import { Input } from "@notra/ui/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@notra/ui/components/ui/select";
import { parseAsString, useQueryState } from "nuqs";
import type { ReactNode } from "react";

import { GeoStatDelta } from "@/components/geo/geo-stat-delta";
import { TrafficPageSourcesCell } from "@/components/geo/traffic-page-sources-cell";
import {
  InstrumentEmpty,
  InstrumentSection,
} from "@/components/instrument/instrument-module";
import { Table, type TableColumn } from "@/components/motion/table";
import { TABLE_ROW_HEIGHT } from "@/constants/table";
import { useGeoTrafficHostQuery } from "@/lib/hooks/use-geo-traffic-host";
import type { GeoTrafficPageGroup, TrafficPagesCardProps } from "@/types/geo";
import {
  filterTrafficPageGroups,
  filterTrafficPageGroupsByHost,
  groupTrafficPages,
  trafficHostSelectOptions,
  trafficHostSelectValue,
  trafficHostsFromPages,
} from "@/utils/ai-traffic-pages";
import { tableHeightFor } from "@/utils/table";

const PAGE_SKELETON_ROWS = 4;
const PAGE_COLUMN_WIDTH = "1fr";
const SOURCE_COLUMN_WIDTH = "1fr";
const VISITS_COLUMN_WIDTH = "9.5rem";

export function TrafficPagesCard({
  pages,
  isPending = false,
  hosts,
}: TrafficPagesCardProps) {
  const [pathQuery, setPathQuery] = useQueryState(
    GEO_TRAFFIC_PAGES_PATH_PARAM,
    parseAsString.withDefault("").withOptions({ clearOnDefault: true })
  );
  const groups = groupTrafficPages(pages);
  const observedHosts = hosts ?? trafficHostsFromPages(pages);
  const [hostQuery, setHostQuery] = useGeoTrafficHostQuery();
  const hostSelectValue = trafficHostSelectValue(hostQuery);
  const appliedHost = trafficLogHostFilter(hostQuery);
  const hostOptions = trafficHostSelectOptions(observedHosts, appliedHost);
  const showHostFilter = hostOptions.length > 1 || appliedHost.length > 0;
  const hasActiveFilter = appliedHost.length > 0 || pathQuery.trim().length > 0;
  const filteredGroups = filterTrafficPageGroupsByHost(
    filterTrafficPageGroups(groups, pathQuery),
    appliedHost
  );
  const handlePathQueryChange = (value: string) => {
    setPathQuery(value);
  };
  const handleHostQueryChange = (value: string) => {
    setHostQuery(value);
  };
  const columns: TableColumn<GeoTrafficPageGroup>[] = [
    {
      key: "path",
      header: "Page",
      width: PAGE_COLUMN_WIDTH,
      sortable: true,
      cell: (row) => (
        <TruncateWithTooltip className="font-mono text-xs">
          {formatTrafficLocation(row.host, row.path)}
        </TruncateWithTooltip>
      ),
      sortValue: (row) => formatTrafficLocation(row.host, row.path),
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
  if (groups.length === 0 && !hasActiveFilter && !isPending) {
    body = (
      <InstrumentEmpty
        message="No AI visits captured yet"
        seed="geo-traffic-pages"
      />
    );
  } else {
    body = (
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {showHostFilter ? (
            <Select
              onValueChange={(value) => {
                if (value) {
                  handleHostQueryChange(
                    value === GEO_TRAFFIC_HOST_ALL ? "" : value
                  );
                }
              }}
              value={hostSelectValue}
            >
              <SelectTrigger
                aria-label="Filter pages by domain"
                className="w-full min-w-0 sm:max-w-52"
                size="sm"
              >
                <SelectValue>
                  {hostSelectValue === GEO_TRAFFIC_HOST_ALL
                    ? "All domains"
                    : hostSelectValue}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={GEO_TRAFFIC_HOST_ALL}>
                  All domains
                </SelectItem>
                {hostOptions.map((host) => (
                  <SelectItem key={host} value={host}>
                    {host}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
          <div className="relative max-w-xs min-w-40 flex-1">
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
        </div>
        {filteredGroups.length === 0 && !isPending ? (
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
            getRowId={(row) => `${row.host}\n${row.path}`}
            height={tableHeightFor(
              filteredGroups.length === 0
                ? PAGE_SKELETON_ROWS
                : filteredGroups.length
            )}
            loading={isPending}
            resizable
            rowHeight={TABLE_ROW_HEIGHT}
          />
        )}
      </div>
    );
  }

  return (
    <InstrumentSection eyebrow="Top pages by AI source">
      {body}
    </InstrumentSection>
  );
}
