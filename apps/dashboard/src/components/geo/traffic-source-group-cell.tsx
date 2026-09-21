import { TrafficSourceGroupIcon } from "@/components/geo/traffic-source-group-icon";
import type { TrafficSourceGroupCellProps } from "@/types/geo";
import { hasTrafficGroupBreakdown } from "@/utils/ai-traffic-groups";

/** Source name plus bot count; the row opens the source drawer with the breakdown. */
export function TrafficSourceGroupCell({ group }: TrafficSourceGroupCellProps) {
  const botCount = group.members.length;
  const noun = group.visitorType === "crawler" ? "bot" : "source";

  return (
    <span className="flex min-w-0 items-center gap-2">
      <span className="flex min-w-0 items-center gap-2 text-sm font-medium">
        <TrafficSourceGroupIcon group={group} />
        <span className="truncate">{group.label}</span>
      </span>
      {hasTrafficGroupBreakdown(group) ? (
        <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
          {botCount} {botCount === 1 ? noun : `${noun}s`}
        </span>
      ) : null}
    </span>
  );
}
