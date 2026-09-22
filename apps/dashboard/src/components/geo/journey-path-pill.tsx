import {
  BookOpen01Icon,
  Globe02Icon,
  Home01Icon,
  News01Icon,
  Search01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { GEO_JOURNEY_PATH_KIND_CLASS } from "@notra/geo-core/constants/geo";
import type { GeoJourneyPathKind } from "@notra/geo-core/types/geo";

import { cn } from "@/lib/utils";
import type { JourneyPathPillProps } from "@/types/geo";

const KIND_ICON: Record<GeoJourneyPathKind, typeof Home01Icon> = {
  home: Home01Icon,
  docs: BookOpen01Icon,
  blog: News01Icon,
  search: Search01Icon,
  page: Globe02Icon,
};

export function JourneyPathPill({ node, className }: JourneyPathPillProps) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1 rounded-full border px-1.5 py-0.5 font-mono text-[0.6875rem] leading-none",
        GEO_JOURNEY_PATH_KIND_CLASS[node.kind],
        className
      )}
      title={node.path}
    >
      <HugeiconsIcon
        className="size-3 shrink-0"
        icon={KIND_ICON[node.kind]}
        strokeWidth={2}
      />
      <span className="min-w-0 truncate">{node.label}</span>
    </span>
  );
}
