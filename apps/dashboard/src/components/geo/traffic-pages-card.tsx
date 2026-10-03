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
import { AnimatedNumber } from "@notra/ui/components/animated-number";
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
import { useLocale, useTranslations } from "use-intl";

import { GeoStatDelta } from "@/components/geo/geo-stat-delta";
import { TrafficPageSourcesCell } from "@/components/geo/traffic-page-sources-cell";
import {
  InstrumentEmpty,
  InstrumentSection,
} from "@/components/instrument/instrument-module";
import { Table, type TableColumn } from "@/components/motion/table";
import { TABLE_ROW_HEIGHT } from "@/constants/table";
import { useGeoTrafficHostQuery } from "@/lib/hooks/use-geo-traffic-host";
import type {
  GeoTrafficPageGroup,
  TrafficPagesCardProps,
  TrafficPagesFiltersProps,
  TrafficPagesResultsProps,
} from "@/types/geo";
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

function trafficPageColumns(
  labels: {
    page: string;
    sources: string;
    visits: string;
  },
  locale: string
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
              <AnimatedNumber locale={locale} value={row.visits} />
            </span>
            <GeoStatDelta animated delta={delta} />
          </span>
        );
      },
    },
  ];
}

function TrafficPagesFilters({
  showHostFilter,
  hostSelectValue,
  hostOptions,
  onHostChange,
  pathQuery,
  onPathQueryChange,
}: TrafficPagesFiltersProps) {
  const t = useTranslations("geo.trafficPagesCard");
  return (
    <div className="flex flex-wrap items-center gap-2">
      {showHostFilter ? (
        <Select
          onValueChange={(value) => {
            if (value) {
              onHostChange(value === GEO_TRAFFIC_HOST_ALL ? "" : value);
            }
          }}
          value={hostSelectValue}
        >
          <SelectTrigger
            aria-label={t("filterByDomain")}
            className="w-full min-w-0 sm:max-w-52"
            size="sm"
          >
            <SelectValue>
              {hostSelectValue === GEO_TRAFFIC_HOST_ALL
                ? t("allDomains")
                : hostSelectValue}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={GEO_TRAFFIC_HOST_ALL}>
              {t("allDomains")}
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
          aria-label={t("filterByPath")}
          className="pl-9"
          onChange={(event) => onPathQueryChange(event.target.value)}
          placeholder={t("filterPlaceholder")}
          value={pathQuery}
        />
      </div>
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
    <Table
      className="rounded-2xl"
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
  hosts,
}: TrafficPagesCardProps) {
  const tGeoShared = useTranslations("geo.shared");
  const tCommon = useTranslations("common");
  const locale = useLocale();
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
    <InstrumentSection eyebrow={tGeoShared("topPagesByAiSource")}>
      <div className="flex flex-col gap-2">
        <TrafficPagesFilters
          hostOptions={hostOptions}
          hostSelectValue={hostSelectValue}
          onHostChange={handleHostQueryChange}
          onPathQueryChange={handlePathQueryChange}
          pathQuery={pathQuery}
          showHostFilter={showHostFilter}
        />
        <TrafficPagesResults
          columns={trafficPageColumns(
            {
              page: tGeoShared("page"),
              sources: tCommon("labels.sources"),
              visits: tGeoShared("visits"),
            },
            locale
          )}
          filteredGroups={filteredGroups}
          isPending={isPending}
        />
      </div>
    </InstrumentSection>
  );
}
