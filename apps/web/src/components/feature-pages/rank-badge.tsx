import { cn } from "@notra/ui/lib/utils";

import {
  FEATURE_TABLE_EMPTY_CELL,
  FEATURE_TOP_RANK,
} from "@/constants/feature-pages/tables";
import type { FeatureRankBadgeProps } from "@/types/feature-detail-page";

export function RankBadge({ rank, size = "sm" }: FeatureRankBadgeProps) {
  const sizeClass = size === "md" ? "px-2 py-0.75" : "px-1.75 py-0.5";

  if (rank === null) {
    return (
      <span
        className={cn(
          "rounded-md font-mono text-xs/4 font-medium text-[#B5B5B5] dark:text-white/30",
          sizeClass
        )}
      >
        {FEATURE_TABLE_EMPTY_CELL}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "rounded-md border font-mono text-xs/4 font-medium",
        sizeClass,
        rank <= FEATURE_TOP_RANK
          ? "border-[#CBE8D4] bg-[#EAF6EE] text-[#2F7D4B]"
          : "border-[#F2DABA] bg-[#FDF3E7] text-[#A8601A]"
      )}
    >
      #{rank}
    </span>
  );
}
