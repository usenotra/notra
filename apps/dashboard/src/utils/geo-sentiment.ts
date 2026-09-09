import type { GeoSentimentResponse } from "@notra/geo-core/types/geo-sentiment";
import {
  engineFamilyLabel,
  engineFamilyOf,
} from "@notra/geo-core/utils/geo-engine-family";
import { sentimentFamilyScore } from "@notra/geo-core/utils/geo-sentiment";

import { SENTIMENT_FAMILY_ORDER } from "@/constants/geo-sentiment";
import type { SentimentFamilyRow } from "@/types/geo-sentiment";

export function hasIsolatedSentimentPoint(
  points: readonly Pick<GeoSentimentResponse["points"][number], "score">[]
): boolean {
  return points.some(
    (point, index) =>
      point.score !== null &&
      points[index - 1]?.score == null &&
      points[index + 1]?.score == null
  );
}

export function sentimentFamilyRows(
  engines: GeoSentimentResponse["engines"]
): SentimentFamilyRow[] {
  const engineNames = engines.map(({ engine }) => engine).sort();
  const families = [...new Set(engineNames.map(engineFamilyOf))];
  return families
    .map((family) => ({
      family,
      iconEngine:
        engineNames.find((engine) => engineFamilyOf(engine) === family) ??
        family,
      label: engineFamilyLabel(family),
      score: sentimentFamilyScore(engines, family),
    }))
    .sort((left, right) => {
      const leftIndex = SENTIMENT_FAMILY_ORDER.indexOf(left.family);
      const rightIndex = SENTIMENT_FAMILY_ORDER.indexOf(right.family);
      return (
        (leftIndex < 0 ? Infinity : leftIndex) -
          (rightIndex < 0 ? Infinity : rightIndex) ||
        left.label.localeCompare(right.label, "en") ||
        left.family.localeCompare(right.family, "en")
      );
    });
}
