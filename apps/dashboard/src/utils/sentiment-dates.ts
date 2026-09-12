import { SENTIMENT_PERIOD_FORMAT } from "@/constants/geo-sentiment";

export function formatSentimentPeriod(from: string, to: string): string {
  return SENTIMENT_PERIOD_FORMAT.formatRange(
    new Date(`${from}T00:00:00Z`),
    new Date(`${to}T00:00:00Z`)
  );
}
