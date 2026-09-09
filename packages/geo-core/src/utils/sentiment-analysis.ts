import { createHash } from "node:crypto";

import { SENTIMENT_ANALYSIS_VERSION } from "../constants/sentiment-analysis";
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
  return `geo:sentiment:${SENTIMENT_ANALYSIS_VERSION}:${createHash("sha256")
    .update(JSON.stringify([organizationId, projectId, from, to]))
    .digest("hex")}`;
}

export function validateSentimentThemes(
  output: unknown,
  sample: SentimentAnalysisSample[]
): SentimentTheme[] {
  const parsed = sentimentThemeOutputSchema.parse(output);
  const checks = new Map(sample.map((check) => [check.id, check]));
  return parsed.themes.map((theme) => {
    const seen = new Set<string>();
    const evidence = theme.evidence.map((reference) => {
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
    return { title: theme.title, polarity: theme.polarity, evidence };
  });
}
