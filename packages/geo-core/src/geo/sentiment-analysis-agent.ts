import { getRouteMetadata } from "@notra/ai/gateway";
import { generateText, Output, type LanguageModel } from "ai";

import {
  SENTIMENT_ANALYSIS_SYSTEM,
  SENTIMENT_ANALYSIS_TIMEOUT_MS,
} from "../constants/sentiment-analysis";
import { sentimentThemeOutputSchema } from "../schemas/sentiment-analysis";
import type {
  SentimentAnalysisSample,
  SentimentAgentResult,
} from "../types/sentiment-analysis";

export async function generateSentimentAnalysis(
  model: LanguageModel,
  sample: SentimentAnalysisSample[],
  brand: string
): Promise<SentimentAgentResult> {
  const result = await generateText({
    model,
    system: SENTIMENT_ANALYSIS_SYSTEM,
    prompt: JSON.stringify({ brand, answers: sample }),
    output: Output.object({ schema: sentimentThemeOutputSchema }),
    maxOutputTokens: 2500,
    maxRetries: 0,
    temperature: 0,
    abortSignal: AbortSignal.timeout(SENTIMENT_ANALYSIS_TIMEOUT_MS),
  });
  return {
    output: result.output,
    usage: result.usage,
    route: getRouteMetadata(result.providerMetadata),
  };
}
