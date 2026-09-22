import { EVALUATION_BOOLEAN_THRESHOLD } from "@notra/ai/constants/evaluation";
import {
  ROUTING_EVALUATION_PRODUCT,
  ROUTING_EVALUATION_QUESTIONS,
} from "@notra/ai/prompts/router";
import type { EvaluationResult } from "@notra/ai/types/evaluation";
import type { RoutingDecision } from "@notra/ai/types/orchestration";

export type RoutingEvaluation = EvaluationResult<
  typeof ROUTING_EVALUATION_QUESTIONS
>;

export function buildRoutingEvaluationState(
  userMessage: string,
  hasIntegrationContext: boolean
) {
  return {
    product: ROUTING_EVALUATION_PRODUCT,
    userMessage,
    hasConnectedIntegrations: hasIntegrationContext,
  };
}

const formatProbability = (value: number) => value.toFixed(2);

/** Thresholds the typed answers and keeps the probabilities in `reasoning`. */
export function routingDecisionFromEvaluation(
  evaluation: RoutingEvaluation
): RoutingDecision {
  const { complexity, requiresTools, reasoningHeavy } = evaluation.answers;
  const complexityProbability =
    complexity.probabilities?.[complexity.choice] ?? 1;

  return {
    complexity: complexity.choice,
    requiresTools: requiresTools.probability >= EVALUATION_BOOLEAN_THRESHOLD,
    reasoningHeavy: reasoningHeavy.probability >= EVALUATION_BOOLEAN_THRESHOLD,
    reasoning: `Jev routed ${complexity.choice} (p=${formatProbability(complexityProbability)}), tools p=${formatProbability(requiresTools.probability)}, reasoning-heavy p=${formatProbability(reasoningHeavy.probability)} in ${evaluation.durationMs} ms`,
  };
}
