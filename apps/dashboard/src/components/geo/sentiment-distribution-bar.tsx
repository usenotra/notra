"use client";

import { useFormatter, useTranslations } from "use-intl";

import {
  SENTIMENT_POLARITIES,
  SENTIMENT_POLARITY_STYLES,
} from "@/constants/geo-sentiment";
import { cn } from "@/lib/utils";
import type { SentimentDistributionBarProps } from "@/types/geo-sentiment";

export function SentimentDistributionBar({
  bucket,
  className,
}: SentimentDistributionBarProps) {
  const tCommon = useTranslations("common.labels");
  const t = useTranslations("geo.sentimentBreakdown");
  const format = useFormatter();
  const rated = SENTIMENT_POLARITIES.some(
    (polarity) => bucket[`${polarity}Share`] !== null
  );
  const ratedLabel = SENTIMENT_POLARITIES.map(
    (polarity) =>
      `${tCommon(polarity)} ${format.number(bucket[`${polarity}Share`] ?? 0, {
        style: "percent",
        maximumFractionDigits: 1,
      })}`
  ).join(", ");
  const label = rated ? ratedLabel : t("noRatedAnswers");

  return (
    <div
      aria-label={label}
      className={cn(
        "bg-muted flex h-2 gap-0.5 overflow-hidden rounded-full",
        className
      )}
      role="img"
    >
      {SENTIMENT_POLARITIES.map((polarity) => (
        <span
          className={cn("h-full", SENTIMENT_POLARITY_STYLES[polarity].fill)}
          key={polarity}
          style={{ width: `${(bucket[`${polarity}Share`] ?? 0) * 100}%` }}
        />
      ))}
    </div>
  );
}
