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

function compactSentimentQuote(value: string) {
  return value
    .normalize("NFKC")
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/[\u2013\u2014\u2212]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

export function validateSentimentThemes(
  output: unknown,
  sample: SentimentAnalysisSample[]
): SentimentTheme[] {
  const parsed = sentimentThemeOutputSchema.parse(output);
  const checks = new Map(sample.map((check) => [check.id, check]));
  const themes = parsed.themes.flatMap((theme) => {
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
        const quote = reference.quote.trim();
        const compactQuote = compactSentimentQuote(quote);
        // Grounding is a filter: one paraphrased or unknown cite must not
        // fail a paid run that still has other verbatim evidence.
        if (
          !(
            check &&
            compactQuote &&
            compactSentimentQuote(check.answer).includes(compactQuote)
          )
        ) {
          return [];
        }
        // Check-level sentiment labels are too coarse for mixed answers. A
        // verbatim clause can validly differ from the answer's overall label.
        // Identical checkId+quote pairs are redundant, not invalid — collapse
        // them (same dedup key the theme-level merge uses below) while still
        // allowing multiple distinct quotes from one check per claim.
        const key = `${check.id}::${compactQuote}`;
        if (seen.has(key)) {
          return [];
        }
        seen.add(key);
        return [
          {
            checkId: reference.checkId,
            quote,
            prompt: check.prompt,
            engine: check.engine,
            capturedAt: check.capturedAt,
          },
        ];
      });
      if (!evidence.length) {
        return [];
      }
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
  if (parsed.themes.length > 0 && themes.length === 0) {
    throw new Error("Sentiment analysis produced no grounded evidence");
  }
  return themes;
}
