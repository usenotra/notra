"use client";

import {
  ArrowDown01Icon,
  PauseIcon,
  PlayIcon,
  QuotesIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  GEO_CITATIONS_LIVE_INTERVAL_MS,
  GEO_CITATIONS_ROW_HEIGHT,
  GEO_TRAFFIC_CITATIONS_ONLY_LABEL,
  GEO_TRAFFIC_LOG_PAGE_PARAM,
  GEO_TRAFFIC_LOG_PURPOSE_OPTIONS,
  GEO_TRAFFIC_LOG_VISITOR_OPTIONS,
} from "@notra/geo-core/constants/geo";
import type { GeoTrafficLogFilters } from "@notra/geo-core/types/geo";
import {
  formatGeoTrafficFilterLabel,
  isGeoTrafficCitationsOnly,
  toggleGeoTrafficCitationsOnly,
  toggleGeoTrafficFilterValue,
} from "@notra/geo-core/utils/ai-traffic";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import { Button } from "@notra/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@notra/ui/components/ui/dropdown-menu";
import { type ReactNode, useState } from "react";

import { CitationsTable } from "@/components/geo/citations-table";
import { GeoTableSkeleton } from "@/components/geo/skeleton-parts";
import {
  InstrumentEmpty,
  InstrumentSection,
} from "@/components/instrument/instrument-module";
import { TRAFFIC_LOG_FILTER_KINDS } from "@/constants/geo-analytics";
import { trackEvent } from "@/lib/analytics/posthog-client";
import { useGeoTrafficLog } from "@/lib/hooks/use-geo";
import { useTablePagination } from "@/lib/hooks/use-table-pagination";
import type { AiTrafficLogCardProps } from "@/types/geo";
import { paginatedTableHeightFor } from "@/utils/table";

const LOG_SKELETON_ROWS = 6;

export function AiTrafficLogCard({ organizationId }: AiTrafficLogCardProps) {
  const [filters, setFilters] = useState<GeoTrafficLogFilters>({
    visitorTypes: [],
    categories: [],
  });
  const [live, setLive] = useState(true);
  const { data, isPending } = useGeoTrafficLog(organizationId, filters, {
    refetchInterval: live ? GEO_CITATIONS_LIVE_INTERVAL_MS : false,
  });
  const log = data?.log ?? [];
  const total = data?.total ?? log.length;
  const pagination = useTablePagination({
    key: GEO_TRAFFIC_LOG_PAGE_PARAM,
    totalItems: log.length,
    isReady: !isPending,
  });
  const citationsOnly = isGeoTrafficCitationsOnly(filters.categories);

  let body: ReactNode;
  if (isPending) {
    body = <GeoTableSkeleton rows={LOG_SKELETON_ROWS} />;
  } else if (log.length === 0) {
    body = (
      <InstrumentEmpty
        message="No visits match these filters"
        seed="geo-traffic-log"
      />
    );
  } else {
    body = (
      <CitationsTable
        entries={log}
        height={paginatedTableHeightFor(
          pagination.pageRowCount,
          GEO_CITATIONS_ROW_HEIGHT
        )}
        pagination={pagination}
      />
    );
  }

  const filterRow = (
    <div className="flex flex-wrap items-center gap-1.5">
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button size="sm" variant="ghost" />}>
          {formatGeoTrafficFilterLabel(
            "All visitors",
            "visitors",
            filters.visitorTypes,
            GEO_TRAFFIC_LOG_VISITOR_OPTIONS
          )}
          <HugeiconsIcon
            aria-hidden="true"
            className="text-muted-foreground"
            data-icon="inline-end"
            icon={ArrowDown01Icon}
            strokeWidth={2}
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          {GEO_TRAFFIC_LOG_VISITOR_OPTIONS.map((option) => (
            <DropdownMenuCheckboxItem
              checked={filters.visitorTypes.includes(option.value)}
              key={option.value}
              onCheckedChange={() => {
                pagination.setPage(1);
                trackEvent(POSTHOG_EVENTS.TRAFFIC_LOG_FILTER_CHANGED, {
                  filter: TRAFFIC_LOG_FILTER_KINDS.VISITOR_TYPE,
                  value: option.value,
                  active: !filters.visitorTypes.includes(option.value),
                });
                setFilters((previous) => ({
                  ...previous,
                  visitorTypes: toggleGeoTrafficFilterValue(
                    previous.visitorTypes,
                    option.value
                  ),
                }));
              }}
            >
              {option.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button size="sm" variant="ghost" />}>
          {formatGeoTrafficFilterLabel(
            "All purposes",
            "purposes",
            filters.categories,
            GEO_TRAFFIC_LOG_PURPOSE_OPTIONS
          )}
          <HugeiconsIcon
            aria-hidden="true"
            className="text-muted-foreground"
            data-icon="inline-end"
            icon={ArrowDown01Icon}
            strokeWidth={2}
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          {GEO_TRAFFIC_LOG_PURPOSE_OPTIONS.map((option) => (
            <DropdownMenuCheckboxItem
              checked={filters.categories.includes(option.value)}
              key={option.value}
              onCheckedChange={() => {
                pagination.setPage(1);
                trackEvent(POSTHOG_EVENTS.TRAFFIC_LOG_FILTER_CHANGED, {
                  filter: TRAFFIC_LOG_FILTER_KINDS.PURPOSE,
                  value: option.value,
                  active: !filters.categories.includes(option.value),
                });
                setFilters((previous) => ({
                  ...previous,
                  categories: toggleGeoTrafficFilterValue(
                    previous.categories,
                    option.value
                  ),
                }));
              }}
            >
              {option.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <Button
        aria-pressed={citationsOnly}
        onClick={() => {
          pagination.setPage(1);
          setFilters((previous) => ({
            ...previous,
            categories: toggleGeoTrafficCitationsOnly(previous.categories),
          }));
        }}
        size="sm"
        variant={citationsOnly ? "secondary" : "ghost"}
      >
        <HugeiconsIcon
          aria-hidden="true"
          data-icon="inline-start"
          icon={QuotesIcon}
          strokeWidth={2}
        />
        {GEO_TRAFFIC_CITATIONS_ONLY_LABEL}
      </Button>
      {total > 0 && (
        <Button
          aria-label={live ? "Live updates: Pause" : "Paused updates: Resume"}
          className="ml-1"
          onClick={() => {
            trackEvent(POSTHOG_EVENTS.TRAFFIC_LIVE_TOGGLED, { live: !live });
            setLive((current) => !current);
          }}
          size="sm"
          variant="ghost"
        >
          <HugeiconsIcon
            aria-hidden="true"
            data-icon="inline-start"
            icon={live ? PauseIcon : PlayIcon}
            strokeWidth={2}
          />
          {live ? "Live" : "Paused"}
        </Button>
      )}
    </div>
  );

  return (
    <InstrumentSection action={filterRow} eyebrow="Recent AI requests">
      {body}
    </InstrumentSection>
  );
}
