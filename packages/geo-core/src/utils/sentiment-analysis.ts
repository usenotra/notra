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
  return parsed.themes.map((theme) => {
    const statements = new Set<string>();
    const claims = theme.claims.map((claim) => {
      const normalized = claim.statement.toLowerCase().replace(/\s+/g, " ");
      if (statements.has(normalized)) {
        throw new Error("Duplicate sentiment claim");
      }
      statements.add(normalized);
      const seen = new Set<string>();
      const evidence = claim.evidence.map((reference) => {
        const check = checks.get(reference.checkId);
        if (
          !check ||
          check.sentiment !== theme.polarity ||
          !reference.quote.trim() ||
          !check.answer.includes(reference.quote) ||
          seen.has(check.id)
        ) {
          throw new Error("Invalid sentiment evidence");
        }
        seen.add(check.id);
        return {
          ...reference,
          prompt: check.prompt,
          engine: check.engine,
          capturedAt: check.capturedAt,
        };
      });
      return { statement: claim.statement, evidence };
    });
    const evidence = [
      ...new Map(
        claims
          .flatMap((claim) => claim.evidence)
          .map((item) => [`${item.checkId}-${item.quote}`, item])
      ).values(),
    ];
    return { title: theme.title, polarity: theme.polarity, evidence, claims };
  });
}
