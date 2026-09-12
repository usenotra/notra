import type { GeoSentimentResponse } from "@notra/geo-core/types/geo-sentiment";
import { todayIsoDate } from "@notra/geo-core/utils/day-label";

import {
  SENTIMENT_ESTIMATE_MAX_DAYS,
  SENTIMENT_ESTIMATE_MIN_DAYS,
} from "@/constants/geo-sentiment";
import { fitMentionTrendLine } from "@/utils/geo-charts";

export function sentimentTailEstimate(
  points: readonly Pick<
    GeoSentimentResponse["points"][number],
    "day" | "score"
  >[],
  today = todayIsoDate()
): (number | null)[] {
  const estimates: (number | null)[] = points.map(() => null);
  const last = points.findLastIndex((point) => point.score !== null);
  if (last < 0 || last === points.length - 1) {
    return estimates;
  }
  const completedDays = points.filter(
    (point) => point.score !== null && point.day < today
  );
  if (completedDays.length < SENTIMENT_ESTIMATE_MIN_DAYS) {
    return estimates;
  }
  const fitted = fitMentionTrendLine(
    points.map((point) => ({
      day: point.day,
      rawDay: point.day,
      score: point.score,
    })),
    "score",
    today
  );
  const first = fitted.findIndex((value) => value !== null);
  const startFit = fitted[first];
  const endFit = fitted[last];
  const lastScore = points[last]?.score;
  if (
    first < 0 ||
    first === last ||
    startFit == null ||
    endFit == null ||
    lastScore == null
  ) {
    return estimates;
  }
  const slope = (endFit - startFit) / (last - first);
  estimates[last] = lastScore;
  for (
    let index = last + 1;
    index < points.length && index <= last + SENTIMENT_ESTIMATE_MAX_DAYS;
    index++
  ) {
    estimates[index] = Math.min(
      100,
      Math.max(0, lastScore + slope * (index - last))
    );
  }
  return estimates;
}
