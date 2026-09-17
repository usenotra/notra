import { describe, expect, test } from "bun:test";

import { selectAutoModel } from "./router";
import type { RoutingEvaluation } from "./router-evaluation";
import {
  buildRoutingEvaluationState,
  routingDecisionFromEvaluation,
} from "./router-evaluation";

function evaluation(
  complexity: "simple" | "complex",
  tools: number,
  heavy: number
): RoutingEvaluation {
  return {
    answers: {
      complexity: {
        type: "choice",
        choice: complexity,
        probabilities: {
          simple: complexity === "simple" ? 0.9 : 0.1,
          complex: complexity === "complex" ? 0.9 : 0.1,
        },
      },
      requiresTools: { type: "boolean", probability: tools },
      reasoningHeavy: { type: "boolean", probability: heavy },
    },
    confidence: {},
    usage: { inputTokens: 100, outputTokens: 10, totalTokens: 110 },
    modelId: "typesafe-ai/jev",
    durationMs: 310,
  };
}

describe("routing decision from evaluation", () => {
  test("thresholds booleans at 0.5 and keeps probabilities in the reasoning", () => {
    const decision = routingDecisionFromEvaluation(
      evaluation("complex", 0.97, 0.12)
    );
    expect(decision).toMatchObject({
      complexity: "complex",
      requiresTools: true,
      reasoningHeavy: false,
    });
    expect(decision.reasoning).toContain("complex (p=0.90)");
    expect(decision.reasoning).toContain("tools p=0.97");
    expect(decision.reasoning).toContain("310 ms");
  });

  test("maps onto the same auto pool as the LLM router", () => {
    expect(
      selectAutoModel(
        routingDecisionFromEvaluation(evaluation("simple", 0.1, 0))
      )
    ).toEqual({ model: "anthropic/claude-sonnet-4.6", thinkingLevel: "off" });
    expect(
      selectAutoModel(
        routingDecisionFromEvaluation(evaluation("complex", 0.9, 0.95))
      )
    ).toEqual({ model: "anthropic/claude-opus-4.8", thinkingLevel: "high" });
    expect(
      selectAutoModel(
        routingDecisionFromEvaluation(evaluation("simple", 0.5, 0.49))
      )
    ).toEqual({ model: "anthropic/claude-sonnet-4.6", thinkingLevel: "low" });
  });

  test("state carries the message and the integration flag", () => {
    expect(buildRoutingEvaluationState("Fix the typo", true)).toMatchObject({
      userMessage: "Fix the typo",
      hasConnectedIntegrations: true,
    });
  });
});
