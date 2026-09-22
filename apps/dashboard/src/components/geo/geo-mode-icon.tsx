"use client";

import {
  AiBrain01Icon,
  Globe02Icon,
  ViewIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { GeoSparklineMode } from "@notra/geo-core/types/geo";

import { cn } from "@/lib/utils";
import type { GeoModeIconProps } from "@/types/geo";

const MODE_ICON = {
  all: ViewIcon,
  // A globe, not a magnifier: the split is "answered from the live web" vs
  // "answered from what the model already knows", not a search box.
  search: Globe02Icon,
  memory: AiBrain01Icon,
} as const;

const MODE_COLOR_CLASS: Record<GeoSparklineMode, string> = {
  all: "text-foreground",
  search: "text-geo-search",
  memory: "text-geo-memory",
};

export function GeoModeIcon({ mode, className }: GeoModeIconProps) {
  return (
    <HugeiconsIcon
      aria-hidden="true"
      className={cn("size-3.5 shrink-0", MODE_COLOR_CLASS[mode], className)}
      icon={MODE_ICON[mode]}
    />
  );
}
