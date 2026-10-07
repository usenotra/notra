"use client";

import {
  GEO_RATE_SPARKLINE_HEIGHT,
  GEO_RATE_SPARKLINE_PADDING,
  GEO_RATE_SPARKLINE_WIDTH,
} from "@notra/geo-core/constants/geo";
import { useTranslations } from "use-intl";

import { cn } from "@/lib/utils";
import type { GeoRateSparklineProps } from "@/types/geo";
import { formatChartPercent } from "@/utils/geo-charts";
import { sparklinePolyline } from "@/utils/sparkline-path";

export function GeoRateSparkline({
  points,
  className,
  ariaLabel,
  style,
  color,
  label,
}: GeoRateSparklineProps) {
  const t = useTranslations("geo.geoRateSparkline");
  const values = points.map((point) => point.value);
  const polyline = sparklinePolyline({
    values,
    width: GEO_RATE_SPARKLINE_WIDTH,
    height: GEO_RATE_SPARKLINE_HEIGHT,
    padding: GEO_RATE_SPARKLINE_PADDING,
  });

  if (polyline.length === 0) {
    return null;
  }

  const first = points[0];
  const last = points.at(-1);
  let trendLabel = t("trend");
  if (first && last) {
    const from = formatChartPercent(first.value);
    const to = formatChartPercent(last.value);
    if (points.length === 1) {
      trendLabel = t("single", { value: from });
    } else if (from === to) {
      trendLabel = t("held", { value: to, days: points.length });
    } else {
      trendLabel = t("changed", { from, to, days: points.length });
    }
  }

  return (
    <svg
      aria-label={ariaLabel ?? label ?? trendLabel}
      className={cn("text-foreground h-5 w-14 shrink-0", className)}
      role="img"
      style={color ? { ...style, color } : style}
      viewBox={`0 0 ${GEO_RATE_SPARKLINE_WIDTH} ${GEO_RATE_SPARKLINE_HEIGHT}`}
    >
      <polyline
        fill="none"
        points={polyline}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
