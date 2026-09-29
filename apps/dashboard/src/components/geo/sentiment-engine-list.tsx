import { useFormatter, useTranslations } from "next-intl";

import { EngineIcon } from "@/components/geo/engine-icon";
import { SentimentDistributionBar } from "@/components/geo/sentiment-distribution-bar";
import { InstrumentModule } from "@/components/instrument/instrument-module";
import { SENTIMENT_SCORE_FORMAT } from "@/constants/geo-sentiment";
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
        <div className="flex flex-col gap-2.5 px-5 py-3.5" key={family}>
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2 font-medium">
              <EngineIcon className="size-4 shrink-0" engine={iconEngine} />
              <span className="truncate">{label}</span>
            </span>
            <span className="font-semibold tabular-nums">
              {bucket.score === null
                ? "—"
                : format.number(
                    Number(SENTIMENT_SCORE_FORMAT.format(bucket.score))
                  )}
            </span>
          </div>
          <SentimentDistributionBar bucket={bucket} className="h-1.5" />
        </div>
      ))}
    </InstrumentModule>
  );
}
