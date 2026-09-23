import type { AgentTokenUsage } from "@notra/ai/types/agents";
import { toAgentTokenUsage } from "@notra/ai/utils/token-usage";
import { NoObjectGeneratedError } from "ai";
import { Effect } from "effect";

import { ACCURACY_ANALYSIS_MODEL } from "../constants/accuracy-analysis";
import type { AccuracyBilledGeneration } from "../types/accuracy-analysis";

export async function billAccuracyAnalysis({
  organizationId,
  billing,
  owns,
  generate,
  modelId = ACCURACY_ANALYSIS_MODEL,
  source = "geo_accuracy_analysis",
  logPrefix = "GeoAccuracyAnalysis",
}: AccuracyBilledGeneration) {
  const reservation = await Effect.runPromise(
    billing.gateContentBilling({
      organizationId,
      executionId: `accuracy-${crypto.randomUUID()}`,
      outputType: null,
      allowPlanIncluded: true,
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
      modelId,
      route: result.route,
    };
    return result.output;
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error) && error.usage) {
      usage = {
        ...toAgentTokenUsage(error.usage),
        modelId,
      };
    }
    throw error;
  } finally {
    await Effect.runPromise(
      billing.finalizeContentBilling({
        reservation,
        action: attempted ? "confirm" : "release",
        units: attempted ? 1 : 0,
        usage,
        fallbackModelId: modelId,
        properties: { source },
        logPrefix,
      })
    );
  }
}
