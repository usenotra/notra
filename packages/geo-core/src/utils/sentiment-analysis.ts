import { createHash } from "node:crypto";

import { SENTIMENT_ANALYSIS_MODEL } from "../constants/sentiment-analysis";
import { sentimentThemeOutputSchema } from "../schemas/sentiment-analysis";
import type {
  SentimentAnalysisSample,
  SentimentTheme,
} from "../types/sentiment-analysis";

export function sentimentAnalysisKey(
  organizationId: string,
  projectId: string | null,
  from: string,
  to: string
) {
  return `geo:sentiment:analysis:${createHash("sha256")
    .update(
      JSON.stringify([
        SENTIMENT_ANALYSIS_MODEL,
        organizationId,
        projectId,
        from,
        to,
      ])
    )
    .digest("hex")}`;
}

export function validateSentimentThemes(
  output: unknown,
  sample: SentimentAnalysisSample[]
): SentimentTheme[] {
  const parsed = sentimentThemeOutputSchema.parse(output);
  const checks = new Map(sample.map((check) => [check.id, check]));
  return parsed.themes.flatMap((theme) => {
    const statements = new Set<string>();
    const claims = theme.claims.flatMap((claim) => {
      const normalized = claim.statement.toLowerCase().replace(/\s+/g, " ");
      if (statements.has(normalized)) {
        throw new Error("Duplicate sentiment claim");
      }
      statements.add(normalized);
      const seen = new Set<string>();
      const evidence = claim.evidence.flatMap((reference) => {
        const check = checks.get(reference.checkId);
        if (!check) {
          throw new Error(
            `Sentiment evidence cites check "${reference.checkId}" which is not in the sample`
          );
        }
        if (!reference.quote.trim()) {
          throw new Error(
            `Sentiment evidence quote is empty for check "${check.id}"`
          );
        }
        if (!check.answer.includes(reference.quote)) {
          throw new Error(
            `Sentiment evidence quote not found verbatim in check "${check.id}"`
          );
        }
        // Check-level sentiment labels are too coarse for mixed answers. A
        // verbatim clause can validly differ from the answer's overall label.
        // Identical checkId+quote pairs are redundant, not invalid — collapse
        // them (same dedup key the theme-level merge uses below) while still
        // allowing multiple distinct quotes from one check per claim.
        const key = `${check.id}::${reference.quote}`;
        if (seen.has(key)) {
          return [];
        }
        seen.add(key);
        return [
          {
            ...reference,
            prompt: check.prompt,
            engine: check.engine,
            capturedAt: check.capturedAt,
          },
        ];
      });
      return [{ statement: claim.statement, evidence }];
    });
    if (!claims.length) {
      return [];
    }
    const evidence = [
      ...new Map(
        claims
          .flatMap((claim) => claim.evidence)
          .map((item) => [`${item.checkId}-${item.quote}`, item])
      ).values(),
    ];
    return [{ title: theme.title, polarity: theme.polarity, evidence, claims }];
  });
}
