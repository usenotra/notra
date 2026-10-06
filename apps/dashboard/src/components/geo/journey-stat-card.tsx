import { AnimatedNumber } from "@notra/ui/components/animated-number";
import {
  InstrumentEmpty,
  InstrumentSection,
} from "@notra/ui/components/instrument/instrument-module";
import { useLocale, useTranslations } from "use-intl";

import { GeoStatDelta } from "@/components/geo/geo-stat-delta";
import { JourneyEmpty } from "@/components/geo/journey-empty";
import type { JourneyStatCardProps } from "@/types/geo";

/**
 * Shared layout for the two journey overviews, so the headline, the stat row
 * and the preview table always line up side by side. It has no card of its
 * own: the table brings the frame.
 */
export function JourneyStatCard({
  eyebrow,
  total,
  caption,
  delta,
  stats,
  emptyMessage,
  emptyDescription,
  emptyMedia,
  emptySeed,
  children,
}: JourneyStatCardProps) {
  const tGeoShared = useTranslations("geo.shared");
  const locale = useLocale();
  const empty = emptyDescription ? (
    <JourneyEmpty
      className="h-full"
      description={emptyDescription}
      media={emptyMedia}
      title={emptyMessage}
    />
  ) : (
    <InstrumentEmpty
      className="h-full"
      message={emptyMessage}
      seed={emptySeed}
    />
  );

  return (
    <InstrumentSection className="h-full" eyebrow={eyebrow}>
      {total === 0 ? (
        empty
      ) : (
        <div className="flex h-full flex-col gap-5">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
            <p className="text-4xl leading-none font-semibold tracking-tight tabular-nums">
              <AnimatedNumber locale={locale} value={total} />
            </p>
            <p className="text-muted-foreground text-sm">{caption}</p>
            {delta === undefined ? null : (
              <GeoStatDelta
                animated
                className="self-center"
                delta={delta}
                hint={tGeoShared("vsPreviousPeriodOfThe")}
                label={eyebrow}
              />
            )}
          </div>
          <dl className="grid grid-cols-3 gap-3">
            {stats.map((stat) => (
              <div className="min-w-0" key={stat.label}>
                <dt className="text-muted-foreground truncate text-xs">
                  {stat.label}
                </dt>
                <dd className="text-foreground mt-0.5 truncate text-sm tabular-nums">
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>
          {children}
        </div>
      )}
    </InstrumentSection>
  );
}
