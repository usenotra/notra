"use client";

import { GEO_TRAFFIC_PAGE_SOURCE_ICON_LIMIT } from "@notra/geo-core/constants/geo";
import type { GeoVisitorType } from "@notra/geo-core/types/geo";
import {
  formatAiTrafficTimestamp,
  formatGeoSource,
} from "@notra/geo-core/utils/ai-traffic";
import {
  HoverCard,
  HoverCardTrigger,
} from "@notra/ui/components/ui/hover-card";
import { useLocale, useTranslations } from "use-intl";

import { EngineIcon } from "@/components/geo/engine-icon";
import { TrafficBreakdownCard } from "@/components/geo/traffic-breakdown-card";
import type { TrafficPageSourcesCellProps } from "@/types/geo";
import { trafficVisitShare } from "@/utils/ai-traffic-groups";

export function TrafficPageSourcesCell({ group }: TrafficPageSourcesCellProps) {
  const t = useTranslations("geo.trafficPageSourcesCell");
  const tGeoShared = useTranslations("geo.shared");
  const tStates = useTranslations("common.states");
  const visitorTypeLabels: Record<Exclude<GeoVisitorType, "human">, string> = {
    crawler: tGeoShared("aiCrawler"),
    ai_referral: tGeoShared("aiReferral"),
    unknown: tStates("unknown"),
  };
  const locale = useLocale();
  const [first] = group.sources;
  if (first === undefined) {
    return null;
  }

  const visible = group.sources.slice(0, GEO_TRAFFIC_PAGE_SOURCE_ICON_LIMIT);
  const overflow = group.sources.length - visible.length;

  return (
    <HoverCard>
      <HoverCardTrigger
        render={
          <button
            aria-label={t("showBreakdown", {
              path: group.path,
              count: group.sources.length,
            })}
            className="focus-visible:ring-ring/50 flex max-w-full min-w-0 cursor-default items-center gap-2 rounded-sm text-left outline-hidden focus-visible:ring-[3px]"
            type="button"
          />
        }
      >
        <span className="flex shrink-0 items-center">
          {visible.map((source, index) => (
            <span
              className="bg-background border-border -ml-1.5 flex size-6 items-center justify-center rounded-full border first:ml-0"
              key={`${source.visitorType}-${source.source}`}
              style={{ zIndex: visible.length - index }}
            >
              <EngineIcon className="size-3.5" engine={source.source} />
            </span>
          ))}
          {overflow > 0 ? (
            <span className="bg-muted border-border text-muted-foreground -ml-1.5 flex size-6 items-center justify-center rounded-full border text-[0.625rem] font-medium tabular-nums">
              +{overflow}
            </span>
          ) : null}
        </span>
      </HoverCardTrigger>
      <TrafficBreakdownCard
        aside={tGeoShared("countPluralOneVisitOther", { count: group.visits })}
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
                    {source.visitorType === "human"
                      ? source.visitorType
                      : visitorTypeLabels[source.visitorType]}
                  </span>
                  <span className="shrink-0 tabular-nums">
                    {formatAiTrafficTimestamp(source.lastSeenAt, locale)}
                  </span>
                </span>
              </span>
              <span className="flex shrink-0 flex-col items-end">
                <span className="text-xs font-medium tabular-nums">
                  {source.visits.toLocaleString(locale)}
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
