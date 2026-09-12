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

  const byName = competitors.find(
    (competitor) => competitorKey(competitor.name) === key
  );
  if (byName) {
    return byName;
  }

  return competitors.find((competitor) =>
    competitor.synonyms.some((synonym) => competitorKey(synonym) === key)
  );
}
