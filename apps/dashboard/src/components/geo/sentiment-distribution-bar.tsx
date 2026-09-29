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
  return (
    <div
      aria-hidden="true"
      className={cn(
        "bg-muted flex h-2 gap-0.5 overflow-hidden rounded-full",
        className
      )}
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
