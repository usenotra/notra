import { afterAll, beforeEach, expect, mock, spyOn, test } from "bun:test";

import { MockLanguageModelV4 } from "ai/test";

import {
  createEvaluationClient,
  setEvaluationClient,
} from "../evaluation/client";
import {
  FEEDBACK_CLASSIFIER_SYSTEM_PROMPT,
  FEEDBACK_EVALUATION_QUESTIONS,
} from "../prompts/feedback-classifier";
import type { ClassifyAgentFeedbackParams } from "../types/feedback-classifier";

let evaluationMode = "success";
let llmFails = false;
const evaluationQuestions: string[][] = [];
const model = new MockLanguageModelV4({
  doGenerate: async () => {
    if (llmFails) {
      throw new Error("Intercepted LLM failure");
    }
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            kind: "feature",
            sentiment: "neutral",
            title: "Generated title",
          }),
        },
      ],
      finishReason: { unified: "stop", raw: "stop" },
      usage: {
        inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
        outputTokens: { total: 10, text: 10, reasoning: 0 },
      },
      warnings: [],
    };
  },
});

const actualGateway = await import("../gateway");
mock.module("@notra/ai/gateway", () => ({
  ...actualGateway,
  gateway: () => model,
}));
const { classifyAgentFeedback } = await import("./feedback-classifier");
const network = spyOn(globalThis, "fetch").mockImplementation(() => {
  throw new Error("Unexpected network request");
});

function paramsFor(mask: number): ClassifyAgentFeedbackParams {
  // Supplied-field bits: kind = 1, sentiment = 2, title = 4.
  const suppliedFields = {
    kind: mask & 1 ? ("praise" as const) : undefined,
    sentiment: mask & 2 ? ("positive" as const) : undefined,
    title: mask & 4 ? "Supplied title" : undefined,
  };
  return {
    organizationId: "org-test",
    feedbackId: "feedback-test",
    message: "The dashboard crashes on load.",
    title: suppliedFields.title,
    contextUrl: "https://example.com/feedback",
    agentClient: "test-agent",
    suppliedFields,
  };
}

beforeEach(() => {
  evaluationMode = "success";
  llmFails = false;
  evaluationQuestions.length = 0;
  model.doGenerateCalls.length = 0;
  setEvaluationClient(
    createEvaluationClient({
      apiKey: "offline-test-key",
      baseURL: "https://mock.invalid",
      enabled: true,
      fetch: async (url, options) => {
        expect(String(url)).toBe("https://mock.invalid/evaluation-model");
        const payload = JSON.parse(String(options?.body));
        const keys = Object.keys(payload.questions);
        evaluationQuestions.push(keys);
        for (const key of keys) {
          expect(payload.questions[key]).toEqual(
            FEEDBACK_EVALUATION_QUESTIONS[
              key as keyof typeof FEEDBACK_EVALUATION_QUESTIONS
            ]
          );
        }
        return new Response(
          JSON.stringify({
            answers:
              evaluationMode === "failure"
                ? {}
                : Object.fromEntries(
                    keys.map((key) => [
                      key,
                      {
                        type: "choice",
                        choice: key === "kind" ? "bug" : "negative",
                      },
                    ])
                  ),
          }),
          { headers: { "content-type": "application/json" } }
        );
      },
    })
  );
});

afterAll(() => {
  setEvaluationClient(null);
  network.mockRestore();
});

test.each([0, 1, 2, 3, 4, 5, 6, 7])(
  "supplied-field combination %i retains stored outputs and skips discarded calls",
  async (mask) => {
    const params = paramsFor(mask);
    const result = await classifyAgentFeedback(params);
    const supplied = params.suppliedFields;
    expect({
      kind: supplied?.kind ?? result?.kind,
      sentiment: supplied?.sentiment ?? result?.sentiment,
      title: supplied?.title ?? result?.title,
    }).toEqual({
      kind: mask & 1 ? "praise" : "bug",
      sentiment: mask & 2 ? "positive" : "negative",
      title: mask & 4 ? "Supplied title" : "Generated title",
    });
    expect(model.doGenerateCalls).toHaveLength(mask & 4 ? 0 : 1);
    let expectedQuestions = ["kind", "sentiment"];
    if (mask === 3 || mask === 7) {
      expectedQuestions = [];
    } else if (mask & 4) {
      expectedQuestions = [
        ...(mask & 1 ? [] : ["kind"]),
        ...(mask & 2 ? [] : ["sentiment"]),
      ];
    }
    expect(evaluationQuestions).toEqual(
      expectedQuestions.length ? [expectedQuestions] : []
    );
  }
);

test("other callers still generate a title even when a contextual title is supplied", async () => {
  const { suppliedFields: _suppliedFields, ...params } = paramsFor(4);
  const result = await classifyAgentFeedback(params);
  expect(result).toEqual({
    kind: "bug",
    sentiment: "negative",
    title: "Generated title",
  });
  expect(model.doGenerateCalls).toHaveLength(1);
  expect(evaluationQuestions).toEqual([["kind", "sentiment"]]);
});

test.each(
  [4, 5, 6].flatMap((mask) =>
    ["unavailable", "failure"].map((mode) => ({ mask, mode }))
  )
)(
  "supplied-title fallback %j keeps the original LLM prompt",
  async ({ mask, mode }) => {
    const params = paramsFor(mask);
    const { suppliedFields: _suppliedFields, ...baselineParams } = params;
    await classifyAgentFeedback(baselineParams);
    const baselinePrompt = model.doGenerateCalls[0]?.prompt;
    model.doGenerateCalls.length = 0;
    evaluationQuestions.length = 0;
    if (mode === "unavailable") {
      setEvaluationClient(createEvaluationClient({ enabled: false }));
    } else {
      evaluationMode = "failure";
    }
    const result = await classifyAgentFeedback(params);
    expect(result).toEqual({
      kind: "feature",
      sentiment: "neutral",
      title: "Generated title",
    });
    expect(model.doGenerateCalls).toHaveLength(1);
    expect(model.doGenerateCalls[0]?.prompt).toEqual(baselinePrompt);
    expect(model.doGenerateCalls[0]?.prompt[0]).toEqual({
      role: "system",
      content: FEEDBACK_CLASSIFIER_SYSTEM_PROMPT,
    });
    expect(evaluationQuestions).toEqual(
      mode === "unavailable"
        ? []
        : [[...(mask & 1 ? [] : ["kind"]), ...(mask & 2 ? [] : ["sentiment"])]]
    );
  }
);

test("title-only generation retains the original prompt and deterministic title fallback", async () => {
  const params = paramsFor(3);
  const { suppliedFields: _suppliedFields, ...baselineParams } = params;
  await classifyAgentFeedback(baselineParams);
  const baselinePrompt = model.doGenerateCalls[0]?.prompt;
  model.doGenerateCalls.length = 0;
  evaluationQuestions.length = 0;
  await classifyAgentFeedback(params);
  expect(model.doGenerateCalls[0]?.prompt).toEqual(baselinePrompt);
  expect(evaluationQuestions).toEqual([]);
  llmFails = true;
  expect(await classifyAgentFeedback(params)).toEqual({
    kind: "praise",
    sentiment: "positive",
    title: "The dashboard crashes on load",
  });
});

test("a failed Jev fallback and failed LLM still return null for missing labels", async () => {
  evaluationMode = "failure";
  llmFails = true;
  expect(await classifyAgentFeedback(paramsFor(5))).toBeNull();
  expect(model.doGenerateCalls).toHaveLength(1);
  expect(evaluationQuestions).toEqual([["sentiment"]]);
});

test("other callers retain null when both providers fail", async () => {
  evaluationMode = "failure";
  llmFails = true;
  const { suppliedFields: _suppliedFields, ...params } = paramsFor(4);
  expect(await classifyAgentFeedback(params)).toBeNull();
  expect(model.doGenerateCalls).toHaveLength(1);
  expect(evaluationQuestions).toEqual([["kind", "sentiment"]]);
});

test("offline baseline/candidate benchmark uses the real classifier and provider boundaries", async () => {
  const counts = {
    baseline: { jev: 0, llm: 0 },
    candidate: { jev: 0, llm: 0 },
  };
  for (const mask of [0, 1, 2, 3, 4, 5, 6, 7]) {
    const params = paramsFor(mask);
    const { suppliedFields, ...baselineParams } = params;
    evaluationQuestions.length = 0;
    model.doGenerateCalls.length = 0;
    // The API already skips classification when all three fields are supplied.
    const baseline =
      mask === 7 ? null : await classifyAgentFeedback(baselineParams);
    const baselinePrompts = model.doGenerateCalls.map((call) => call.prompt);
    counts.baseline.jev += evaluationQuestions.length;
    counts.baseline.llm += model.doGenerateCalls.length;
    evaluationQuestions.length = 0;
    model.doGenerateCalls.length = 0;
    const candidate = mask === 7 ? null : await classifyAgentFeedback(params);
    counts.candidate.jev += evaluationQuestions.length;
    counts.candidate.llm += model.doGenerateCalls.length;
    if (model.doGenerateCalls.length) {
      expect(model.doGenerateCalls.map((call) => call.prompt)).toEqual(
        baselinePrompts
      );
    }
    expect({
      kind: suppliedFields?.kind ?? candidate?.kind ?? "other",
      sentiment: suppliedFields?.sentiment ?? candidate?.sentiment ?? null,
      title: suppliedFields?.title ?? candidate?.title ?? null,
    }).toEqual({
      kind: suppliedFields?.kind ?? baseline?.kind ?? "other",
      sentiment: suppliedFields?.sentiment ?? baseline?.sentiment ?? null,
      title: suppliedFields?.title ?? baseline?.title ?? null,
    });
  }
  expect(counts).toEqual({
    baseline: { jev: 7, llm: 7 },
    candidate: { jev: 6, llm: 4 },
  });
  expect(network).not.toHaveBeenCalled();
  console.log("Offline feedback benchmark:", JSON.stringify(counts));
});
