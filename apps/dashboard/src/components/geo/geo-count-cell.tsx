import { trafficVisitDelta } from "@notra/geo-core/utils/ai-traffic";
import { AnimatedNumber } from "@notra/ui/components/animated-number";
import { useLocale, useTranslations } from "use-intl";

import { GeoStatDelta } from "@/components/geo/geo-stat-delta";
import type { GeoCountCellProps } from "@/types/geo";

export function GeoCountCell({
  label,
  value,
  previousValue,
  unavailableHint,
}: GeoCountCellProps) {
  const tGeoShared = useTranslations("geo.shared");
  const locale = useLocale();
  return (
    <span className="flex items-center justify-end gap-2">
      {previousValue == null && unavailableHint ? (
        <span className="text-muted-foreground text-xs" title={unavailableHint}>
          –
        </span>
      ) : (
        <GeoStatDelta
          animated
          delta={
            previousValue == null
              ? null
              : trafficVisitDelta(value, previousValue)
          }
          hint={tGeoShared("vsPreviousPeriodOfThe")}
          label={label}
        />
      )}
      <span className="min-w-8 text-right text-sm tabular-nums">
        <AnimatedNumber locale={locale} value={value} />
      </span>
    </span>
  );
}
