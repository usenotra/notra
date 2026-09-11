import { competitorKey } from "@notra/geo-core/geo/domain";
import type { GeoCompetitor } from "@notra/geo-core/types/geo";

export function findMentionedCompetitor(
  competitors: readonly GeoCompetitor[],
  phrase: string
): GeoCompetitor | undefined {
  const key = competitorKey(phrase);
  if (key.length === 0) {
    return undefined;
  }

  return competitors.find((competitor) => {
    if (competitorKey(competitor.name) === key) {
      return true;
    }
    return competitor.synonyms.some(
      (synonym) => competitorKey(synonym) === key
    );
  });
}
