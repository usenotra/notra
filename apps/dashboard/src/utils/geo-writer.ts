import { competitorKey } from "@notra/geo-core/geo/domain";
import type { GeoCompetitor } from "@notra/geo-core/types/geo";

import { GEO_WRITE_FORMAT_RULES } from "@/constants/geo-writer";
import type { WriteFormatRecommendation } from "@/types/components/geo-writer";

export function recommendedContentSubtype(
  prompt: string
): WriteFormatRecommendation {
  const trimmed = prompt.trim();
  for (const rule of GEO_WRITE_FORMAT_RULES) {
    if (rule.pattern.test(trimmed)) {
      return { id: rule.id };
    }
  }
  return { id: "guide" };
}

export function isWriterCompetitorMentioned(
  competitor: GeoCompetitor,
  mentionedCompetitors: readonly string[]
): boolean {
  const keys = new Set(
    [competitor.name, ...(competitor.synonyms ?? [])].map(competitorKey)
  );
  return mentionedCompetitors.some((name) => keys.has(competitorKey(name)));
}
