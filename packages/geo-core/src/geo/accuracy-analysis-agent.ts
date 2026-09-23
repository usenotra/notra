import { getRouteMetadata } from "@notra/ai/gateway";
import { generateText, Output, type LanguageModel } from "ai";

import {
  ACCURACY_ANALYSIS_MAX_TOKENS,
  ACCURACY_ANALYSIS_SYSTEM,
  ACCURACY_ANALYSIS_TIMEOUT_MS,
} from "../constants/accuracy-analysis";
import { accuracyClaimOutputSchema } from "../schemas/accuracy-analysis";
import type {
  AccuracyAgentResult,
  AccuracyAnalysisSample,
  GeoBrandFact,
} from "../types/accuracy-analysis";

export async function generateAccuracyAnalysis(
  model: LanguageModel,
  sample: AccuracyAnalysisSample[],
  brand: { companyName: string; facts: GeoBrandFact[] }
): Promise<AccuracyAgentResult> {
  const result = await generateText({
    model,
    instructions: ACCURACY_ANALYSIS_SYSTEM,
    prompt: JSON.stringify({
      brand: brand.companyName,
      facts: brand.facts.map((fact) => ({
        statement: fact.statement,
        category: fact.category,
      })),
      answers: sample.map((row) => ({
        id: row.id,
        prompt: row.prompt,
        engine: row.engine,
        capturedAt: row.capturedAt,
        answer: row.answer,
      })),
    }),
    output: Output.object({ schema: accuracyClaimOutputSchema }),
    maxOutputTokens: ACCURACY_ANALYSIS_MAX_TOKENS,
    reasoning: "low",
    maxRetries: 0,
    abortSignal: AbortSignal.timeout(ACCURACY_ANALYSIS_TIMEOUT_MS),
  });
  return {
    output: result.output,
    usage: result.usage,
    route: getRouteMetadata(result.finalStep.providerMetadata),
  };
}
