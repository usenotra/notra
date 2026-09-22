"use client";

import { FilterHorizontalIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  GEO_CITATIONS_ROW_HEIGHT,
  GEO_TRAFFIC_LOG_PURPOSE_OPTIONS,
  GEO_TRAFFIC_LOG_VISITOR_OPTIONS,
} from "@notra/geo-core/constants/geo";
import type { GeoTrafficLogFilters } from "@notra/geo-core/types/geo";
import { toggleGeoTrafficFilterValue } from "@notra/geo-core/utils/ai-traffic";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import { Button } from "@notra/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@notra/ui/components/ui/dropdown-menu";
import { type ReactNode, useState } from "react";

import { CitationsTable } from "@/components/geo/citations-table";
import {
  InstrumentEmpty,
  InstrumentSection,
} from "@/components/instrument/instrument-module";
import { TRAFFIC_LOG_FILTER_KINDS } from "@/constants/geo-analytics";
import { trackEvent } from "@/lib/analytics/posthog-client";
import { useGeoTrafficLog } from "@/lib/hooks/use-geo";
import { useGeoTrafficHostQuery } from "@/lib/hooks/use-geo-traffic-host";
import type { AiTrafficLogCardProps } from "@/types/geo";
import { tableHeightFor } from "@/utils/table";

const LOG_SKELETON_ROWS = 6;

export function AiTrafficLogCard({ organizationId }: AiTrafficLogCardProps) {
  const [filters, setFilters] = useState<GeoTrafficLogFilters>({
    visitorTypes: [],
    categories: [],
  });
  const [hostQuery] = useGeoTrafficHostQuery();
  const { data, isPending, isFetching } = useGeoTrafficLog(
    organizationId,
    filters,
    {
      host: hostQuery,
    }
  );
  const log = data?.log ?? [];

  let body: ReactNode;
  if (!isPending && log.length === 0) {
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
        height={tableHeightFor(
          log.length === 0 ? LOG_SKELETON_ROWS : log.length,
          GEO_CITATIONS_ROW_HEIGHT
        )}
        loading={isPending || isFetching}
      />
    );
  }

  const activeFilters = filters.visitorTypes.length + filters.categories.length;
  const toggleVisitor = (
    value: GeoTrafficLogFilters["visitorTypes"][number]
  ) => {
    trackEvent(POSTHOG_EVENTS.TRAFFIC_LOG_FILTER_CHANGED, {
      filter: TRAFFIC_LOG_FILTER_KINDS.VISITOR_TYPE,
      value,
      active: !filters.visitorTypes.includes(value),
    });
    setFilters((previous) => ({
      ...previous,
      visitorTypes: toggleGeoTrafficFilterValue(previous.visitorTypes, value),
    }));
  };
  const togglePurpose = (value: GeoTrafficLogFilters["categories"][number]) => {
    trackEvent(POSTHOG_EVENTS.TRAFFIC_LOG_FILTER_CHANGED, {
      filter: TRAFFIC_LOG_FILTER_KINDS.PURPOSE,
      value,
      active: !filters.categories.includes(value),
    });
    setFilters((previous) => ({
      ...previous,
      categories: toggleGeoTrafficFilterValue(previous.categories, value),
    }));
  };

  const filterRow = (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button size="sm" variant="outline" />}>
        <HugeiconsIcon
          aria-hidden="true"
          data-icon="inline-start"
          icon={FilterHorizontalIcon}
          strokeWidth={2}
        />
        Filter
        {activeFilters > 0 ? (
          <span className="bg-primary/15 text-primary rounded-full px-1.5 text-xs tabular-nums">
            {activeFilters}
          </span>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Visitors</DropdownMenuLabel>
          {GEO_TRAFFIC_LOG_VISITOR_OPTIONS.map((option) => (
            <DropdownMenuCheckboxItem
              checked={filters.visitorTypes.includes(option.value)}
              key={option.value}
              onCheckedChange={() => toggleVisitor(option.value)}
            >
              {option.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>Purpose</DropdownMenuLabel>
          {GEO_TRAFFIC_LOG_PURPOSE_OPTIONS.map((option) => (
            <DropdownMenuCheckboxItem
              checked={filters.categories.includes(option.value)}
              key={option.value}
              onCheckedChange={() => togglePurpose(option.value)}
            >
              {option.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuGroup>
        {activeFilters > 0 ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                setFilters({ visitorTypes: [], categories: [] });
              }}
            >
              Clear filters
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <InstrumentSection action={filterRow} eyebrow="Recent AI requests">
      {body}
    </InstrumentSection>
  );
}
