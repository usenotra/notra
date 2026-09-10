"use client";

import { PlusSignIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  GEO_BRAND_DISCOVERED_LABEL,
  GEO_BRAND_TRACK_ACTION,
  GEO_BRAND_TRACKED_LABEL,
} from "@notra/geo-core/constants/geo";
import { Badge } from "@notra/ui/components/ui/badge";

import { Button } from "@/components/button";
import { cn } from "@/lib/utils";
import type {
  BrandTrackingBadgeProps,
  TrackBrandButtonProps,
} from "@/types/geo";

export function BrandTrackingBadge({
  tracked,
  className,
}: BrandTrackingBadgeProps) {
  return (
    <Badge
      className={cn("text-muted-foreground shrink-0 font-normal", className)}
      variant={tracked ? "secondary" : "outline"}
    >
      {tracked ? GEO_BRAND_TRACKED_LABEL : GEO_BRAND_DISCOVERED_LABEL}
    </Badge>
  );
}

export function TrackBrandButton({
  brand,
  onTrack,
  className,
}: TrackBrandButtonProps) {
  return (
    <Button
      aria-label={`${GEO_BRAND_TRACK_ACTION} ${brand}`}
      className={cn("h-7 shrink-0 gap-1 px-2 text-xs", className)}
      onClick={(event) => {
        event.stopPropagation();
        onTrack(brand);
      }}
      onPointerDown={(event) => event.stopPropagation()}
      size="xs"
      variant="outline"
    >
      <HugeiconsIcon
        aria-hidden="true"
        className="size-3.5"
        icon={PlusSignIcon}
      />
      <span data-track-label>{GEO_BRAND_TRACK_ACTION}</span>
    </Button>
  );
}
