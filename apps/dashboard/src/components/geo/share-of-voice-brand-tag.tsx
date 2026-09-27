"use client";

import { PlusSignIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Badge } from "@notra/ui/components/ui/badge";
import { useTranslations } from "next-intl";

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
  const tGeoShared = useTranslations("geo.shared");
  return (
    <Badge
      className={cn("text-muted-foreground shrink-0 font-normal", className)}
      variant={tracked ? "secondary" : "outline"}
    >
      {tracked ? tGeoShared("tracked") : tGeoShared("discovered")}
    </Badge>
  );
}

export function TrackBrandButton({
  brand,
  onTrack,
  className,
}: TrackBrandButtonProps) {
  const t = useTranslations("geo.shareOfVoiceBrandTag");
  const tGeoShared = useTranslations("geo.shared");
  return (
    <Button
      aria-label={t("trackBrand", { brand })}
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
      <span data-track-label>{tGeoShared("track")}</span>
    </Button>
  );
}
