import type { SentimentTheme } from "@notra/geo-core/types/sentiment-analysis";

import type { SentimentDetailRow } from "@/types/geo-sentiment";

export function sentimentTableRows(
  themes: SentimentTheme[]
): SentimentDetailRow[] {
  return themes.flatMap((theme) =>
    theme.claims.map((claim) => ({
      id: JSON.stringify([theme.polarity, theme.title, claim.statement]),
      title: claim.statement,
      theme: theme.title,
      polarity: theme.polarity,
      evidence: claim.evidence,
    }))
  );
}
