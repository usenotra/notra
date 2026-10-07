"use client";

import { Button } from "@notra/ui/components/ui/button";
import { useTranslations } from "use-intl";

import type { TrafficZoomChipProps } from "@/types/geo";

/** Shows the zoomed day range and resets it. Renders nothing while not zoomed. */
export function TrafficZoomChip({
  rows,
  zoomed,
  onReset,
}: TrafficZoomChipProps) {
  const t = useTranslations("geo.trafficHero");
  if (!zoomed) {
    return null;
  }
  return (
    <Button onClick={onReset} size="sm" variant="outline">
      {rows[0]?.day} – {rows.at(-1)?.day}
      <span className="text-muted-foreground">{t("resetZoom")}</span>
    </Button>
  );
}
