import { getEvaluationClient } from "@notra/ai/evaluation/client";
import type { GeoBrandFact } from "@notra/db/types/geo-accuracy";

import {
  ACCURACY_EVALUATION_FEATURE,
  ACCURACY_EVALUATION_TIMEOUT_MS,
} from "../constants/accuracy-analysis";
import type { AccuracyClaim } from "../types/accuracy-analysis";
import { attachVerdicts } from "../utils/accuracy-analysis";
import {
  accuracyVerdictQuestions,
  buildAccuracyEvaluationState,
  rankedProbabilitiesFromAnswers,
} from "../utils/accuracy-evaluation";

export async function rankAccuracyClaims(
  extracted: readonly Omit<AccuracyClaim, "verdict" | "probabilities">[],
  facts: readonly GeoBrandFact[],
  companyName: string,
  organizationId: string,
  abortSignal?: AbortSignal
): Promise<AccuracyClaim[]> {
  if (extracted.length === 0) {
    return [];
  }
  const client = getEvaluationClient();
  if (!client.isAvailable()) {
    throw new Error("Evaluation model unavailable");
  }
  const result = await client.evaluate({
    feature: ACCURACY_EVALUATION_FEATURE,
    organizationId,
    state: buildAccuracyEvaluationState(facts, extracted, companyName),
    questions: accuracyVerdictQuestions(
      extracted.map((claim) => claim.statement)
    ),
    timeoutMs: ACCURACY_EVALUATION_TIMEOUT_MS,
    abortSignal,
  });
  return attachVerdicts(
    extracted,
    rankedProbabilitiesFromAnswers(
      result.answers as Record<string, unknown>,
      extracted.length
    )
  );
}
