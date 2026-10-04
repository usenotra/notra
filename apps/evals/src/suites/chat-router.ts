import { EVALUATION_MODEL_ID } from "@notra/ai/constants/evaluation";
import { selectAutoModel } from "@notra/ai/orchestration/router";
import {
  buildRoutingEvaluationState,
  routingDecisionFromEvaluation,
} from "@notra/ai/orchestration/router-evaluation";
import {
  ROUTING_EVALUATION_QUESTIONS,
  ROUTING_PROMPT,
} from "@notra/ai/prompts/router";
import { routingDecisionSchema } from "@notra/ai/schemas/orchestration";
import type { RoutingDecision } from "@notra/ai/types/orchestration";

import { callJev, callObject } from "../models/gateway";
import type { EvalCase, EvalSuite, FieldScore } from "../types/eval";

interface RouterInput {
  message: string;
  hasIntegrationContext: boolean;
}

interface RouterExpected {
  complexity: "simple" | "complex";
  requiresTools: boolean;
  reasoningHeavy: boolean;
}

type Row = [string, RouterExpected["complexity"], boolean, boolean, boolean?];

// [message, complexity, requiresTools, reasoningHeavy, hasIntegrationContext]
const ROWS: Row[] = [
  [
    "Write a changelog for everything we shipped this week",
    "complex",
    true,
    false,
    true,
  ],
  ["Make the intro shorter", "simple", true, false],
  ["Can you fix the typo in the second heading?", "simple", true, false],
  [
    "What's the difference between a changelog and release notes?",
    "simple",
    false,
    false,
  ],
  ["Turn the last 3 PRs into a LinkedIn post", "complex", true, false, true],
  [
    "Compare our last four blog posts and tell me which narrative works best and why, then propose a content strategy for Q4",
    "complex",
    true,
    true,
  ],
  ["Rewrite this whole post in German", "simple", true, false],
  ["How do I connect Linear?", "simple", false, false],
  [
    "Analyze our GitHub activity for the last month and write a long-form blog post about the architecture changes",
    "complex",
    true,
    true,
    true,
  ],
  ["Change the title to 'Faster funnels'", "simple", true, false],
  ["wie läuft mein GEO diese Woche?", "simple", true, false, true],
  ["Explain what a feature flag is", "simple", false, false],
  [
    "Research which features our competitors launched and write a positioning memo",
    "complex",
    true,
    true,
  ],
  ["Make this sound less salesy", "simple", true, false],
  [
    "Draft three tweet variants about the Slack alerts release",
    "complex",
    true,
    false,
    true,
  ],
  ["Schedule this post for Monday 9am", "simple", true, false],
  ["Why do you recommend posting on Tuesdays?", "simple", false, false],
  [
    "Give me a critique of this draft: structure, argument, tone, and what a skeptical CTO would push back on",
    "complex",
    true,
    true,
  ],
  ["Add a bullet about the HubSpot export", "simple", true, false],
  [
    "Summarize what changed in the repo since the last release",
    "complex",
    true,
    false,
    true,
  ],
  [
    "Can you write a blog post from scratch about why retention beats acquisition?",
    "complex",
    true,
    true,
  ],
  ["Is markdown supported in LinkedIn posts?", "simple", false, false],
  [
    "Pull the Linear issues closed this cycle and draft an investor update",
    "complex",
    true,
    false,
    true,
  ],
  ["Shorten every paragraph to two sentences", "simple", true, false],
];

const CASES: EvalCase<RouterInput, RouterExpected>[] = ROWS.map(
  (
    [message, complexity, requiresTools, reasoningHeavy, hasIntegrationContext],
    index
  ) => ({
    id: `r${String(index + 1).padStart(2, "0")}`,
    title: message,
    input: { message, hasIntegrationContext: hasIntegrationContext ?? false },
    expected: { complexity, requiresTools, reasoningHeavy },
  })
);

function routeLabel(
  decision: Pick<
    RoutingDecision,
    "complexity" | "requiresTools" | "reasoningHeavy"
  >
) {
  const selection = selectAutoModel({ ...decision, reasoning: "" });
  return `${selection.model.split("/").at(-1)}:${selection.thinkingLevel}`;
}

export const chatRouterSuite: EvalSuite<
  RouterInput,
  RouterExpected,
  RoutingDecision
> = {
  id: "chat-router",
  name: "Chat router",
  kind: "classification",
  stage: "orchestration/router.ts routeMessage",
  description:
    "Routes a chat message to simple/complex, tools yes/no and reasoning-heavy, which picks the Auto model (Sonnet 5 vs Opus 5.5 + thinking level). LLMs get ROUTING_PROMPT + routingDecisionSchema like the gpt-oss fallback; Jev gets ROUTING_EVALUATION_QUESTIONS like the primary path.",
  cases: CASES,
  productionModel: EVALUATION_MODEL_ID,
  defaultContenders: [
    "typesafe-ai/jev",
    "openai/gpt-oss-120b",
    "openai/gpt-6-luna",
  ],
  labelFields: ["complexity", "requiresTools", "reasoningHeavy", "route"],
  timeoutMs: 20_000,
  async run(input, ctx) {
    if (ctx.contender.kind === "jev") {
      const startedAt = performance.now();
      const result = await callJev({
        modelId: ctx.contender.modelId,
        feature: "chat-router",
        state: buildRoutingEvaluationState(
          input.message,
          input.hasIntegrationContext
        ),
        questions: ROUTING_EVALUATION_QUESTIONS,
        abortSignal: ctx.abortSignal,
      });
      const decision = routingDecisionFromEvaluation({
        answers: result.output.answers,
        confidence: result.output.confidence,
        usage: {
          inputTokens: result.usage.inputTokens,
          outputTokens: result.usage.outputTokens,
          totalTokens: undefined,
        },
        modelId: ctx.contender.modelId,
        durationMs: Math.round(performance.now() - startedAt),
      });
      return {
        ...result,
        output: decision,
        transcript: `${decision.reasoning}\n\n${result.transcript ?? ""}`,
      };
    }

    const contextHint = input.hasIntegrationContext
      ? "\n\nNote: The user has connected integration context (for example GitHub or Linear), so they may want help using external project data."
      : "";
    const result = await callObject({
      modelId: ctx.contender.modelId,
      feature: "chat-router",
      schema: routingDecisionSchema,
      system: ROUTING_PROMPT,
      prompt: `Classify this user message:\n\n"${input.message}"${contextHint}`,
      abortSignal: ctx.abortSignal,
    });
    return { ...result, transcript: JSON.stringify(result.output, null, 2) };
  },
  score(output, testCase) {
    const expected = testCase.expected;
    const fields: FieldScore[] = [
      {
        field: "complexity",
        score: output.complexity === expected.complexity ? 1 : 0,
        expected: expected.complexity,
        actual: output.complexity,
      },
      {
        field: "requiresTools",
        score: output.requiresTools === expected.requiresTools ? 1 : 0,
        expected: String(expected.requiresTools),
        actual: String(output.requiresTools),
      },
      {
        field: "reasoningHeavy",
        score: output.reasoningHeavy === expected.reasoningHeavy ? 1 : 0,
        expected: String(expected.reasoningHeavy),
        actual: String(output.reasoningHeavy),
      },
    ];
    const expectedRoute = routeLabel(expected);
    const actualRoute = routeLabel(output);
    fields.push({
      field: "route",
      score: expectedRoute === actualRoute ? 1 : 0,
      expected: expectedRoute,
      actual: actualRoute,
    });
    const score =
      fields.reduce((sum, item) => sum + item.score, 0) / fields.length;
    return { score, pass: expectedRoute === actualRoute, fields };
  },
  demoOutput(testCase, demo) {
    const expected = testCase.expected;
    return {
      complexity: demo.pick(expected.complexity, [
        "simple",
        "complex",
      ] as const),
      requiresTools: demo.pick(expected.requiresTools, [true, false]),
      reasoningHeavy: demo.pick(expected.reasoningHeavy, [true, false]),
      reasoning: "demo",
    };
  },
};
