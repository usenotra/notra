"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { AI_TRAFFIC_PURPOSE_LABELS } from "@notra/geo-core/constants/geo";
import { formatGeoSource } from "@notra/geo-core/utils/ai-traffic";
import {
  HoverCard,
  HoverCardTrigger,
} from "@notra/ui/components/ui/hover-card";

import { PurposeBadge } from "@/components/geo/purpose-badge";
import { TrafficBreakdownCard } from "@/components/geo/traffic-breakdown-card";
import { TrafficSourceGroupIcon } from "@/components/geo/traffic-source-group-icon";
import { AI_TRAFFIC_PURPOSE_ICONS } from "@/constants/geo-purpose-icons";
import type { TrafficPurposeCellProps } from "@/types/geo";
import {
  hasTrafficGroupBreakdown,
  trafficGroupPurposeTotals,
  trafficVisitShare,
} from "@/utils/ai-traffic-groups";

export function TrafficPurposeCell({ group }: TrafficPurposeCellProps) {
  const [single] = group.categories;
  if (single === undefined) {
    return null;
  }

  if (!hasTrafficGroupBreakdown(group)) {
    return <PurposeBadge category={single} />;
  }

  const totals = trafficGroupPurposeTotals(group);
  const compact = group.categories.length > 1;
  const purposeLabels = totals
    .map((total) => AI_TRAFFIC_PURPOSE_LABELS[total.category] ?? total.category)
    .join(", ");

  return (
    <HoverCard>
      <HoverCardTrigger
        render={
          <button
            aria-label={`${group.label} purposes: ${purposeLabels}, show breakdown`}
            className="focus-visible:ring-ring/50 flex max-w-full cursor-default items-center gap-1 rounded-sm outline-hidden focus-visible:ring-[3px]"
            type="button"
          />
        }
      >
        {group.categories.map((category) => (
          <PurposeBadge
            category={category}
            compact={compact}
            key={category}
            tooltip={false}
          />
        ))}
      </HoverCardTrigger>
      <TrafficBreakdownCard
        aside={`${group.visits.toLocaleString()} visits`}
        icon={<TrafficSourceGroupIcon group={group} />}
        title={group.label}
      >
        <ul>
          {totals.map((total) => {
            const icon = AI_TRAFFIC_PURPOSE_ICONS[total.category];
            return (
              <li
                className="flex items-center gap-2 px-3 py-1.5"
                key={total.category}
              >
                {icon ? (
                  <HugeiconsIcon
                    aria-hidden="true"
                    className="text-muted-foreground size-3.5 shrink-0"
                    icon={icon}
                    strokeWidth={2}
                  />
                ) : (
                  <span aria-hidden="true" className="size-3.5 shrink-0" />
                )}
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-xs font-medium">
                    {AI_TRAFFIC_PURPOSE_LABELS[total.category] ??
                      total.category}
                  </span>
                  <span className="text-muted-foreground truncate text-[0.6875rem]">
                    {total.members
                      .map((member) => formatGeoSource(member))
                      .join(", ")}
                  </span>
                </span>
                <span className="flex shrink-0 flex-col items-end">
                  <span className="text-xs font-medium tabular-nums">
                    {total.visits.toLocaleString()}
                  </span>
                  <span className="text-muted-foreground text-[0.6875rem] tabular-nums">
                    {trafficVisitShare(total.visits, group.visits)}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      </TrafficBreakdownCard>
    </HoverCard>
  );
}
