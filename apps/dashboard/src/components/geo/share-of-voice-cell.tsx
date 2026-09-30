"use client";

import { GeoBar } from "@notra/ui/components/geo/geo-bar";

import { formatUsageShare } from "@/utils/geo-charts";

/** Share-of-voice bar scaled against the table's leader, with the percent. */
export function ShareOfVoiceCell({
  share,
  max,
  own = false,
}: {
  share: number;
  max: number;
  own?: boolean;
}) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <GeoBar
        className="h-2 max-w-40"
        fillClassName={own ? "bg-primary" : "bg-muted-foreground/40"}
        max={max}
        value={share}
      />
      <span className="w-12 shrink-0 text-xs tabular-nums">
        {formatUsageShare(share)}
      </span>
    </span>
  );
}
