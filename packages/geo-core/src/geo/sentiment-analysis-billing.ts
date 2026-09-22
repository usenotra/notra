import type { AgentTokenUsage } from "@notra/ai/types/agents";
import { toAgentTokenUsage } from "@notra/ai/utils/token-usage";
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
      ...toAgentTokenUsage(result.usage),
      modelId: SENTIMENT_ANALYSIS_MODEL,
      route: result.route,
    };
    return result.output;
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error) && error.usage) {
      usage = {
        ...toAgentTokenUsage(error.usage),
        modelId: SENTIMENT_ANALYSIS_MODEL,
      };
    }
    throw error;
  } finally {
    // An attempted call confirms usage even if output validation fails.
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
