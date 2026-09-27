"use client";

import { Badge } from "@notra/ui/components/ui/badge";
import { useTranslations } from "next-intl";

import {
  GEO_DIRECTIONS_DELTA_CLASS,
  GEO_DIRECTIONS_DELTA_GLYPH,
} from "@/constants/geo-directions";
import { cn } from "@/lib/utils";
import type { DirectionDeltaProps } from "@/types/geo-directions";
import {
  directionDeltaTone,
  formatDirectionDelta,
} from "@/utils/geo-directions";

export function DirectionDelta({ delta, className }: DirectionDeltaProps) {
  const t = useTranslations("geo.directions.delta");
  const tone = directionDeltaTone(delta);

  return (
    <Badge
      className={cn(
        "gap-1 rounded-sm tabular-nums",
        GEO_DIRECTIONS_DELTA_CLASS[tone],
        className
      )}
      variant="outline"
    >
      <span aria-hidden="true">{GEO_DIRECTIONS_DELTA_GLYPH[tone]}</span>
      {t("points", { delta: formatDirectionDelta(delta) })}
    </Badge>
  );
}
