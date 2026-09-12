import type { SentimentTheme } from "@notra/geo-core/types/sentiment-analysis";

import type {
  SentimentDetailRow,
  SentimentTableView,
} from "@/types/geo-sentiment";

export function sentimentTableRows(
  themes: SentimentTheme[],
  view: SentimentTableView
): SentimentDetailRow[] {
  if (view === "themes") {
    return themes.map((theme) => ({
      id: `${theme.polarity}-${theme.title}`,
      title: theme.title,
      polarity: theme.polarity,
      evidence: theme.evidence,
    }));
  }
  const answers = new Map<string, SentimentDetailRow>();
  for (const theme of themes) {
    for (const evidence of theme.evidence) {
      const existing = answers.get(evidence.checkId);
      if (existing) {
        if (!existing.evidence.some((item) => item.quote === evidence.quote)) {
          existing.evidence.push(evidence);
        }
      } else {
        answers.set(evidence.checkId, {
          id: evidence.checkId,
          title: evidence.prompt,
          polarity: theme.polarity,
          evidence: [evidence],
        });
      }
    }
  }
  return [...answers.values()];
}
