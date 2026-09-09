import { FEATURES } from "@notra/ai/billing/features";
import type { AgentTokenUsage } from "@notra/ai/types/agents";
import { NoObjectGeneratedError } from "ai";
import { Effect } from "effect";

import { SENTIMENT_ANALYSIS_MODEL } from "../constants/sentiment-analysis";
import type { SentimentBilledGeneration } from "../types/sentiment-analysis";

export async function billSentimentAnalysis({
  organizationId,
  billing,
  owns,
  generate,
}: SentimentBilledGeneration) {
  const reservation = await Effect.runPromise(
    billing.gateContentBilling({
      organizationId,
      executionId: `sentiment-${crypto.randomUUID()}`,
      outputType: null,
      quotaFeatureId: FEATURES.AI_ANSWERS,
      units: 1,
    })
  );
  if (!reservation.allowed) {
    throw new Error("AI credits unavailable");
  }
  let attempted = false;
  let usage: AgentTokenUsage | undefined;
  try {
    if (!(await owns())) {
      throw new Error("Analysis lease expired");
    }
    attempted = true;
    const result = await generate();
    usage = {
      inputTokens: result.usage.inputTokens ?? 0,
      outputTokens: result.usage.outputTokens ?? 0,
      totalTokens: result.usage.totalTokens ?? 0,
      cacheReadTokens: result.usage.inputTokenDetails.cacheReadTokens ?? 0,
      cacheWriteTokens: result.usage.inputTokenDetails.cacheWriteTokens ?? 0,
      modelId: SENTIMENT_ANALYSIS_MODEL,
      route: result.route,
    };
    return result.output;
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error) && error.usage) {
      usage = {
        inputTokens: error.usage.inputTokens ?? 0,
        outputTokens: error.usage.outputTokens ?? 0,
        totalTokens: error.usage.totalTokens ?? 0,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        modelId: SENTIMENT_ANALYSIS_MODEL,
      };
    }
    throw error;
  } finally {
    // An attempted call consumes one quota unit even if output validation fails.
    await Effect.runPromise(
      billing.finalizeContentBilling({
        reservation,
        action: attempted ? "confirm" : "release",
        units: attempted ? 1 : 0,
        usage,
        fallbackModelId: SENTIMENT_ANALYSIS_MODEL,
        properties: { source: "geo_sentiment_analysis" },
        logPrefix: "GeoSentimentAnalysis",
      })
    );
  }
}
