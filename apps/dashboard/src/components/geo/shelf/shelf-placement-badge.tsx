"use client";

import {
  CancelCircleIcon,
  CheckmarkCircle02Icon,
  HelpCircleIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Badge } from "@notra/ui/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import { useTranslations } from "use-intl";

import { useGeoShelfPlacementLabels } from "@/lib/hooks/use-geo-shelf-labels";
import { cn } from "@/lib/utils";
import type {
  GeoShelfPlacementBadgeProps,
  GeoShelfPlacementMarkProps,
} from "@/types/geo-shelf";

const PLACEMENT_ICONS = {
  present: CheckmarkCircle02Icon,
  absent: CancelCircleIcon,
  unknown: HelpCircleIcon,
} as const;

const PLACEMENT_TEXT = {
  present: "text-emerald-700 dark:text-emerald-300",
  absent: "text-muted-foreground",
  unknown: "text-muted-foreground",
} as const;

const PLACEMENT_BADGE = {
  present:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  absent: "border-border bg-muted/60 text-muted-foreground",
  unknown: "border-dashed border-border text-muted-foreground",
} as const;

export function ShelfPlacementMark({
  status,
  className,
}: GeoShelfPlacementMarkProps) {
  const placementLabels = useGeoShelfPlacementLabels();
  const resolved = status ?? "unknown";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5",
        PLACEMENT_TEXT[resolved],
        className
      )}
    >
      <HugeiconsIcon
        aria-hidden="true"
        className="size-3.5 shrink-0"
        icon={PLACEMENT_ICONS[resolved]}
        strokeWidth={2}
      />
      {placementLabels[resolved]}
    </span>
  );
}

function evidenceHintKey(
  status: GeoShelfPlacementMarkProps["status"],
  evidence: GeoShelfPlacementBadgeProps["evidence"]
) {
  if (status === "unknown" || status === null || !evidence) {
    return null;
  }
  return evidence === "manual" ? "markedByTeammate" : "verifiedByFetch";
}

function placementHintText(parts: (string | null)[]): string {
  return parts.filter((part): part is string => Boolean(part)).join(". ");
}

const HINT_TRIGGER_CLASS =
  "inline-flex max-w-full cursor-help rounded-sm border-0 bg-transparent p-0 focus-visible:outline-2 focus-visible:outline-offset-2";

export function ShelfPlacementBadge({
  status,
  evidence,
  className,
  tooltip = true,
}: GeoShelfPlacementBadgeProps) {
  const t = useTranslations("geo.shelf.shelfPlacementBadge");
  const tLabels = useTranslations("geo.shelf.labels");
  const placementLabels = useGeoShelfPlacementLabels();
  const resolved = status ?? "unknown";
  const label = placementLabels[resolved];
  const hint = tLabels(`placementHint.${resolved}`);
  const sourceHintKey = evidenceHintKey(resolved, evidence);
  const sourceHint = sourceHintKey ? t(sourceHintKey) : null;
  const badge = (
    <Badge
      className={cn(
        "gap-1 rounded-sm text-[0.6875rem] whitespace-nowrap",
        PLACEMENT_BADGE[resolved],
        className
      )}
      variant="outline"
    >
      <HugeiconsIcon
        aria-hidden="true"
        className="size-3 shrink-0"
        icon={PLACEMENT_ICONS[resolved]}
        strokeWidth={2}
      />
      {label}
    </Badge>
  );

  if (!tooltip) {
    return badge;
  }

  return (
    <Tooltip>
      <TooltipTrigger
        aria-label={placementHintText([label, hint, sourceHint])}
        className={HINT_TRIGGER_CLASS}
      >
        {badge}
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-pretty">
        <span className="block font-medium">{label}</span>
        {hint}
        {sourceHint ? (
          <span className="text-muted-foreground mt-0.5 block">
            {sourceHint}
          </span>
        ) : null}
      </TooltipContent>
    </Tooltip>
  );
}
