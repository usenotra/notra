"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { formatGeoSource } from "@notra/geo-core/utils/ai-traffic";
import { DetailCardContent } from "@notra/ui/components/ui/detail-card";
import {
  HoverCard,
  HoverCardTrigger,
} from "@notra/ui/components/ui/hover-card";
import { useLocale, useTranslations } from "use-intl";

import { PurposeBadge } from "@/components/geo/purpose-badge";
import { TrafficSourceGroupIcon } from "@/components/geo/traffic-source-group-icon";
import { AI_TRAFFIC_PURPOSE_LABEL_KEYS } from "@/constants/ai-traffic-purposes";
import { AI_TRAFFIC_PURPOSE_ICONS } from "@/constants/geo-purpose-icons";
import type { TrafficPurposeCellProps } from "@/types/geo";
import {
  hasTrafficGroupBreakdown,
  trafficGroupPurposeTotals,
  trafficVisitShare,
} from "@/utils/ai-traffic-groups";
import { aiTrafficPurposeKey } from "@/utils/ai-traffic-purpose";

export function TrafficPurposeCell({ group }: TrafficPurposeCellProps) {
  const t = useTranslations("geo.trafficPurposeCell");
  const tGeoShared = useTranslations("geo.shared");
  const locale = useLocale();
  const purposeLabel = (category: string) => {
    const key = aiTrafficPurposeKey(category);
    return key === null
      ? category
      : tGeoShared(AI_TRAFFIC_PURPOSE_LABEL_KEYS[key]);
  };
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
    .map((total) => purposeLabel(total.category))
    .join(", ");

  return (
    <HoverCard>
      <HoverCardTrigger
        render={
          <button
            aria-label={t("showBreakdown", {
              label: group.label,
              purposes: purposeLabels,
            })}
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
      <DetailCardContent
        aside={tGeoShared("countPluralOneVisitOther", { count: group.visits })}
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
                    {purposeLabel(total.category)}
                  </span>
                  <span className="text-muted-foreground truncate text-[0.6875rem]">
                    {total.members
                      .map((member) => formatGeoSource(member))
                      .join(", ")}
                  </span>
                </span>
                <span className="flex shrink-0 flex-col items-end">
                  <span className="text-xs font-medium tabular-nums">
                    {total.visits.toLocaleString(locale)}
                  </span>
                  <span className="text-muted-foreground text-[0.6875rem] tabular-nums">
                    {trafficVisitShare(total.visits, group.visits)}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      </DetailCardContent>
    </HoverCard>
  );
}
