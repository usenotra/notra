import { trafficVisitDelta } from "@notra/geo-core/utils/ai-traffic";
import { AnimatedNumber } from "@notra/ui/components/animated-number";
import { useLocale, useTranslations } from "next-intl";

import { GeoStatDelta } from "@/components/geo/geo-stat-delta";
import type { JourneyCountCellProps } from "@/types/geo";

/** Journey count with its change vs the previous window. */
export function JourneyCountCell({
  label,
  journeys,
  previousJourneys,
}: JourneyCountCellProps) {
  const tGeoShared = useTranslations("geo.shared");
  const locale = useLocale();
  return (
    <span className="flex items-center justify-end gap-2">
      <GeoStatDelta
        animated
        delta={trafficVisitDelta(journeys, previousJourneys)}
        hint={tGeoShared("vsPreviousPeriodOfThe")}
        label={label}
      />
      <span className="min-w-8 text-right text-sm tabular-nums">
        <AnimatedNumber locale={locale} value={journeys} />
      </span>
    </span>
  );
}
