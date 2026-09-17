import { describe, expect, test } from "bun:test";

import { fallbackFeedbackTitle } from "../utils/feedback-title";
import type { FeedbackEvaluation } from "./feedback-evaluation";
import {
  buildFeedbackEvaluationState,
  mergeFeedbackClassification,
} from "./feedback-evaluation";

const params = {
  organizationId: "org_test",
  message:
    "Calling POST /v1/posts with a scheduledAt in the past returns a 500 instead of a validation error.\nSecond line.",
  agentClient: "claude-code",
};

const evaluation: FeedbackEvaluation = {
  answers: {
    kind: { type: "choice", choice: "bug" },
    sentiment: { type: "choice", choice: "negative" },
  },
  confidence: {},
  usage: { inputTokens: 100, outputTokens: 10, totalTokens: 110 },
  modelId: "typesafe-ai/jev",
  durationMs: 300,
};

const generated = {
  kind: "feature" as const,
  sentiment: "neutral" as const,
  title: "Past scheduledAt returns 500",
};

describe("feedback classification merge", () => {
  test("typed answers win for kind and sentiment, the LLM keeps the title", () => {
    expect(mergeFeedbackClassification(params, evaluation, generated)).toEqual({
      kind: "bug",
      sentiment: "negative",
      title: "Past scheduledAt returns 500",
    });
  });

  test("falls back to a derived title when only the evaluation succeeded", () => {
    expect(mergeFeedbackClassification(params, evaluation, null)).toEqual({
      kind: "bug",
      sentiment: "negative",
      title:
        "Calling POST /v1/posts with a scheduledAt in the past returns a 500 instead of…",
    });
  });

  test("uses the LLM result alone when the evaluation was skipped", () => {
    expect(mergeFeedbackClassification(params, null, generated)).toBe(
      generated
    );
    expect(mergeFeedbackClassification(params, null, null)).toBeNull();
  });

  test("state exposes the submitted metadata as nullable fields", () => {
    expect(buildFeedbackEvaluationState(params)).toEqual({
      title: null,
      contextUrl: null,
      submittedBy: "claude-code",
      feedback: params.message,
    });
  });
});

describe("fallback feedback title", () => {
  test("prefers the submitted title and strips trailing punctuation", () => {
    expect(fallbackFeedbackTitle("body", "  Docs example broken. ")).toBe(
      "Docs example broken"
    );
  });

  test("takes the first non-empty line and collapses whitespace", () => {
    expect(
      fallbackFeedbackTitle("\n\n  Notra   MCP is awesome 🙌 \nmore")
    ).toBe("Notra MCP is awesome 🙌");
  });

  test("cuts long messages at a word boundary within the limit", () => {
    const title = fallbackFeedbackTitle(params.message);
    expect(title.length).toBeLessThanOrEqual(80);
    expect(title.endsWith("…")).toBe(true);
    expect(title).not.toContain("  ");
  });

  test("never returns an empty title", () => {
    expect(fallbackFeedbackTitle("   ")).toBe("Feedback");
  });
});
