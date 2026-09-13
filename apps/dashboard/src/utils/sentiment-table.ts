import type { SentimentTheme } from "@notra/geo-core/types/sentiment-analysis";

import type { SentimentDetailRow } from "@/types/geo-sentiment";

export function sentimentTableRows(
  themes: SentimentTheme[]
): SentimentDetailRow[] {
  const rows = new Map<string, SentimentDetailRow>();
  for (const theme of themes) {
    for (const claim of theme.claims) {
      const id = JSON.stringify([theme.polarity, theme.title, claim.statement]);
      const row = rows.get(id) ?? {
        id,
        title: claim.statement,
        theme: theme.title,
        polarity: theme.polarity,
        evidence: [],
      };
      const seen = new Set(
        row.evidence.map(({ checkId, quote }) =>
          JSON.stringify([checkId, quote])
        )
      );
      for (const evidence of claim.evidence) {
        const key = JSON.stringify([evidence.checkId, evidence.quote]);
        if (!seen.has(key)) {
          row.evidence.push(evidence);
          seen.add(key);
        }
      }
      rows.set(id, row);
    }
  }
  return [...rows.values()];
}
