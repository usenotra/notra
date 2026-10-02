import { useFormatter, useTranslations } from "use-intl";

import { EngineIcon } from "@/components/geo/engine-icon";
import { SentimentDistributionBar } from "@/components/geo/sentiment-distribution-bar";
import { InstrumentModule } from "@/components/instrument/instrument-module";
import type { SentimentFamilyBucket } from "@/types/geo-sentiment";

export function SentimentEngineList({
  families,
}: {
  families: readonly SentimentFamilyBucket[];
}) {
  const t = useTranslations("geo.sentimentBreakdown");
  const format = useFormatter();
  return (
    <InstrumentModule
      bodyClassName="flex flex-col divide-y p-0"
      className="h-full @min-[44rem]/main:col-span-5"
      eyebrow={t("byEngine")}
      readout={t("enginesCount", { count: families.length })}
      variant="table"
    >
      {families.map(({ family, iconEngine, label, bucket }) => (
        <div
          className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)_2rem] items-center gap-4 px-5 py-2.5 text-sm"
          key={family}
        >
          <span className="flex min-w-0 items-center gap-2 font-medium">
            <EngineIcon className="size-4 shrink-0" engine={iconEngine} />
            <span className="truncate">{label}</span>
          </span>
          <SentimentDistributionBar bucket={bucket} className="h-1.5" />
          <span className="text-right font-semibold tabular-nums">
            {bucket.score === null
              ? "—"
              : format.number(Math.round(bucket.score))}
          </span>
        </div>
      ))}
    </InstrumentModule>
  );
}
