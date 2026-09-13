import type {
  GeoSentimentCounts,
  GeoSentimentRow,
} from "@notra/db/types/geo-sentiment";

import type { GeoSentimentBucket } from "../types/geo-sentiment";
import { engineFamilyOf } from "./geo-engine-family";

export function sentimentScore(
  counts: Pick<GeoSentimentCounts, "positive" | "neutral" | "negative">
): number | null {
  const classified = counts.positive + counts.neutral + counts.negative;
  return classified > 0
    ? (counts.positive * 100 + counts.neutral * 50) / classified
    : null;
}

export function sentimentFamilyScore(
  rows: (GeoSentimentCounts & { engine: string })[],
  family: string
): number | null {
  return summarizeSentiment(
    rows.filter((row) => engineFamilyOf(row.engine) === family)
  ).score;
}

export function exactSentimentExcerpt(
  answer: string,
  excerpt: string
): string | null {
  if (!excerpt.trim()) {
    return null;
  }
  const index = answer.indexOf(excerpt);
  return index < 0 ? null : answer.slice(index, index + excerpt.length);
}

export function summarizeSentiment(
  rows: GeoSentimentCounts[]
): GeoSentimentBucket {
  const counts = rows.reduce<GeoSentimentCounts>(
    (sum, row) => ({
      totalChecks: sum.totalChecks + row.totalChecks,
      mentions: sum.mentions + row.mentions,
      positive: sum.positive + row.positive,
      neutral: sum.neutral + row.neutral,
      negative: sum.negative + row.negative,
      lastCheckedAt:
        row.lastCheckedAt &&
        (!sum.lastCheckedAt || row.lastCheckedAt > sum.lastCheckedAt)
          ? row.lastCheckedAt
          : sum.lastCheckedAt,
    }),
    {
      totalChecks: 0,
      mentions: 0,
      positive: 0,
      neutral: 0,
      negative: 0,
      lastCheckedAt: null,
    }
  );
  const classifiedMentions = counts.positive + counts.neutral + counts.negative;
  return {
    ...counts,
    score: sentimentScore(counts),
    classifiedMentions,
    unknownMentions: counts.mentions - classifiedMentions,
    notMentioned: counts.totalChecks - counts.mentions,
    positiveShare: classifiedMentions
      ? counts.positive / classifiedMentions
      : null,
    neutralShare: classifiedMentions
      ? counts.neutral / classifiedMentions
      : null,
    negativeShare: classifiedMentions
      ? counts.negative / classifiedMentions
      : null,
    classificationCoverage: counts.mentions
      ? classifiedMentions / counts.mentions
      : null,
  };
}

export function sentimentPoints(rows: GeoSentimentRow[]) {
  const days = [...new Set(rows.map((row) => row.day))].sort();
  const first = days.at(0);
  const last = days.at(-1);
  if (!first || !last) {
    return [];
  }
  const points = [];
  const date = new Date(`${first}T00:00:00Z`);
  while (date.toISOString().slice(0, 10) <= last) {
    const day = date.toISOString().slice(0, 10);
    points.push({
      day,
      ...summarizeSentiment(rows.filter((row) => row.day === day)),
    });
    date.setUTCDate(date.getUTCDate() + 1);
  }
  return points;
}
