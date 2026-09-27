import { useTranslations } from "next-intl";

import { TrafficSourceGroupIcon } from "@/components/geo/traffic-source-group-icon";
import type { TrafficSourceGroupCellProps } from "@/types/geo";
import { hasTrafficGroupBreakdown } from "@/utils/ai-traffic-groups";

/** Source name plus bot count; the row opens the source drawer with the breakdown. */
export function TrafficSourceGroupCell({ group }: TrafficSourceGroupCellProps) {
  const tGeoShared = useTranslations("geo.shared");
  const tCommon = useTranslations("common");
  const botCount = group.members.length;

  return (
    <span className="flex min-w-0 items-center gap-2">
      <span className="flex min-w-0 items-center gap-2 text-sm font-medium">
        <TrafficSourceGroupIcon group={group} />
        <span className="truncate">{group.label}</span>
      </span>
      {hasTrafficGroupBreakdown(group) ? (
        <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
          {group.visitorType === "crawler"
            ? tGeoShared("countPluralOneBotOther", { count: botCount })
            : tCommon("messages.countPluralOneSourceOther", {
                count: botCount,
              })}
        </span>
      ) : null}
    </span>
  );
}
