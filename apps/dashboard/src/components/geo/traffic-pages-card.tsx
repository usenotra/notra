"use client";

import { SearchIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { GEO_TRAFFIC_PAGES_PATH_PARAM } from "@notra/geo-core/constants/geo";
import { formatGeoSource } from "@notra/geo-core/utils/ai-traffic";
import {
  formatTrafficLocation,
  trafficLogHostFilter,
} from "@notra/geo-core/utils/geo-project-domains";
import {
  InstrumentEmpty,
  InstrumentSection,
} from "@notra/ui/components/instrument/instrument-module";
import { TruncateWithTooltip } from "@notra/ui/components/shared/truncate-with-tooltip";
import {
  DataTable,
  type TableColumn,
} from "@notra/ui/components/ui/data-table";
import { Input } from "@notra/ui/components/ui/input";
import { parseAsString, useQueryState } from "nuqs";
import { useTranslations } from "use-intl";

import { GeoCountCell } from "@/components/geo/geo-count-cell";
import { TrafficPageSourcesCell } from "@/components/geo/traffic-page-sources-cell";
import {
  GEO_COUNT_COLUMN_WIDTH,
  PAGE_COLUMN_WIDTH,
  PAGE_SKELETON_ROWS,
  SOURCE_COLUMN_WIDTH,
} from "@/constants/geo-table";
import { TABLE_ROW_HEIGHT } from "@/constants/table";
import { useGeoTrafficHostQuery } from "@/lib/hooks/use-geo-traffic-host";
import type {
  GeoTrafficPageGroup,
  TrafficPageColumnLabels,
  TrafficPagesCardProps,
  TrafficPagesFiltersProps,
  TrafficPagesResultsProps,
} from "@/types/geo";
import {
  filterTrafficPageGroups,
  filterTrafficPageGroupsByHost,
  groupTrafficPages,
} from "@/utils/ai-traffic-pages";
import { tableHeightFor } from "@/utils/table";

function trafficPageColumns(
  labels: TrafficPageColumnLabels
): TableColumn<GeoTrafficPageGroup>[] {
  return [
    {
      key: "path",
      header: labels.page,
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
      header: labels.sources,
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
      header: labels.visits,
      width: GEO_COUNT_COLUMN_WIDTH,
      align: "right",
      sortable: true,
      cell: (row) => (
        <GeoCountCell
          label={formatTrafficLocation(row.host, row.path)}
          previousValue={row.previousVisits}
          value={row.visits}
        />
      ),
    },
  ];
}

function TrafficPagesFilters({
  pathQuery,
  onPathQueryChange,
}: TrafficPagesFiltersProps) {
  const t = useTranslations("geo.trafficPagesCard");
  return (
    <div className="relative w-full min-w-40 @min-[32rem]/instrument:w-80">
      <HugeiconsIcon
        className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2"
        icon={SearchIcon}
        size={15}
      />
      <Input
        aria-label={t("filterByPath")}
        className="pl-9"
        onChange={(event) => onPathQueryChange(event.target.value)}
        placeholder={t("filterPlaceholder")}
        value={pathQuery}
      />
    </div>
  );
}

function TrafficPagesResults({
  columns,
  filteredGroups,
  isPending,
}: TrafficPagesResultsProps) {
  const t = useTranslations("geo.trafficPagesCard");
  if (filteredGroups.length === 0 && !isPending) {
    return (
      <InstrumentEmpty message={t("noMatch")} seed="geo-traffic-pages-filter" />
    );
  }
  return (
    <DataTable
      columns={columns}
      data={filteredGroups}
      defaultSort={{ key: "visits", direction: "desc" }}
      emptyState={t("noMatch")}
      getRowId={(row) => `${row.host}\n${row.path}`}
      height={tableHeightFor(
        filteredGroups.length === 0 ? PAGE_SKELETON_ROWS : filteredGroups.length
      )}
      loading={isPending}
      resizable
      rowHeight={TABLE_ROW_HEIGHT}
    />
  );
}

export function TrafficPagesCard({
  pages,
  isPending = false,
}: TrafficPagesCardProps) {
  const tGeoShared = useTranslations("geo.shared");
  const tCommon = useTranslations("common");
  const [pathQuery, setPathQuery] = useQueryState(
    GEO_TRAFFIC_PAGES_PATH_PARAM,
    parseAsString.withDefault("").withOptions({ clearOnDefault: true })
  );
  const groups = groupTrafficPages(pages);
  const [hostQuery] = useGeoTrafficHostQuery();
  const appliedHost = trafficLogHostFilter(hostQuery);
  const hasActiveFilter = appliedHost.length > 0 || pathQuery.trim().length > 0;
  const filteredGroups = filterTrafficPageGroupsByHost(
    filterTrafficPageGroups(groups, pathQuery),
    appliedHost
  );
  const handlePathQueryChange = (value: string) => {
    setPathQuery(value);
  };

  if (groups.length === 0 && !hasActiveFilter && !isPending) {
    return (
      <InstrumentSection eyebrow={tGeoShared("topPagesByAiSource")}>
        <InstrumentEmpty
          message={tGeoShared("noAiVisitsCapturedYet")}
          seed="geo-traffic-pages"
        />
      </InstrumentSection>
    );
  }

  return (
    <InstrumentSection
      action={
        <TrafficPagesFilters
          onPathQueryChange={handlePathQueryChange}
          pathQuery={pathQuery}
        />
      }
      eyebrow={tGeoShared("topPagesByAiSource")}
    >
      <TrafficPagesResults
        columns={trafficPageColumns({
          page: tGeoShared("page"),
          sources: tCommon("labels.sources"),
          visits: tGeoShared("visits"),
        })}
        filteredGroups={filteredGroups}
        isPending={isPending}
      />
    </InstrumentSection>
  );
}
