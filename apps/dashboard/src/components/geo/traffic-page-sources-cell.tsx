"use client";

import {
  GEO_TRAFFIC_PAGE_SOURCE_ICON_LIMIT,
  GEO_VISITOR_TYPE_LABELS,
} from "@notra/geo-core/constants/geo";
import {
  formatAiTrafficTimestamp,
  formatGeoSource,
} from "@notra/geo-core/utils/ai-traffic";
import {
  HoverCard,
  HoverCardTrigger,
} from "@notra/ui/components/ui/hover-card";

import { EngineIcon } from "@/components/geo/engine-icon";
import { TrafficBreakdownCard } from "@/components/geo/traffic-breakdown-card";
import { TrafficSourceIconStack } from "@/components/geo/traffic-source-group-icon";
import type { TrafficPageSourcesCellProps } from "@/types/geo";
import { trafficVisitShare } from "@/utils/ai-traffic-groups";
import { trafficPageSourcesLabel } from "@/utils/ai-traffic-pages";

export function TrafficPageSourcesCell({ group }: TrafficPageSourcesCellProps) {
  const [first] = group.sources;
  if (first === undefined) {
    return null;
  }

  const visible = group.sources.slice(0, GEO_TRAFFIC_PAGE_SOURCE_ICON_LIMIT);
  const overflow = group.sources.length - visible.length;
  const sourcesLabel = trafficPageSourcesLabel(group);

  return (
    <HoverCard>
      <HoverCardTrigger
        render={
          <button
            aria-label={`${group.path}: ${sourcesLabel}, show breakdown`}
            className="focus-visible:ring-ring/50 flex max-w-full min-w-0 cursor-default items-center gap-2 rounded-sm text-left outline-hidden focus-visible:ring-[3px]"
            type="button"
          />
        }
      >
        <TrafficSourceIconStack
          engines={visible.map((source) => source.source)}
          overflow={overflow}
        />
      </HoverCardTrigger>
      <TrafficBreakdownCard
        aside={`${group.visits.toLocaleString()} visits`}
        icon={null}
        title={group.path}
      >
        <ul>
          {group.sources.map((source) => (
            <li
              className="flex items-center gap-2 px-3 py-1.5"
              key={`${source.visitorType}-${source.source}`}
            >
              <EngineIcon className="size-3.5" engine={source.source} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-xs font-medium">
                  {formatGeoSource(source.source)}
                </span>
                <span className="text-muted-foreground flex gap-2 text-[0.6875rem]">
                  <span className="truncate">
                    {GEO_VISITOR_TYPE_LABELS[source.visitorType] ??
                      source.visitorType}
                  </span>
                  <span className="shrink-0 tabular-nums">
                    {formatAiTrafficTimestamp(source.lastSeenAt)}
                  </span>
                </span>
              </span>
              <span className="flex shrink-0 flex-col items-end">
                <span className="text-xs font-medium tabular-nums">
                  {source.visits.toLocaleString()}
                </span>
                <span className="text-muted-foreground text-[0.6875rem] tabular-nums">
                  {trafficVisitShare(source.visits, group.visits)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </TrafficBreakdownCard>
    </HoverCard>
  );
}
