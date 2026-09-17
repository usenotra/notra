import { describe, expect, test } from "bun:test";

import { createEvaluationClient } from "./client";

const QUESTIONS = {
  tone: {
    type: "choice",
    instructions: "Tone?",
    criteria: { warm: null, cold: null },
  },
  urgent: { type: "boolean", instructions: "Urgent?" },
} as const;

function fakeFetch(
  handler: (request: { url: string; init: RequestInit }) => Response
): { fetch: typeof fetch; calls: { url: string; init: RequestInit }[] } {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetchImpl = ((input: string | URL | Request, init?: RequestInit) => {
    const call = { url: String(input), init: init ?? {} };
    calls.push(call);
    return Promise.resolve(handler(call));
  }) as typeof fetch;
  return { fetch: fetchImpl, calls };
}

const okBody = {
  answers: {
    tone: {
      type: "choice",
      choice: "warm",
      probabilities: { warm: 0.9, cold: 0.1 },
    },
    urgent: { type: "boolean", probability: 0.2 },
  },
  usage: { inputTokens: 120, outputTokens: 10 },
  providerMetadata: { typesafe: { confidence: { tone: 0.8 } } },
};

describe("evaluation client", () => {
  test("posts the gateway evaluation request and maps typed answers", async () => {
    const { fetch, calls } = fakeFetch(() => Response.json(okBody));
    const client = createEvaluationClient({
      apiKey: "key_test",
      fetch,
      baseURL: "https://gateway.test/v4/ai",
    });

    const result = await client.evaluate({
      feature: "test",
      state: { message: "hi" },
      questions: QUESTIONS,
      timeoutMs: 1000,
    });

    expect(calls).toHaveLength(1);
    const [call] = calls;
    expect(call?.url).toBe("https://gateway.test/v4/ai/evaluation-model");
    const headers = new Headers(call?.init.headers);
    expect(headers.get("authorization")).toBe("Bearer key_test");
    expect(headers.get("ai-model-id")).toBe("typesafe-ai/jev");
    const body = JSON.parse(String(call?.init.body));
    expect(body.state).toEqual({ message: "hi" });
    expect(body.questions).toEqual(QUESTIONS);
    expect(body.providerOptions.gateway.zeroDataRetention).toBe(true);

    expect(result.answers.tone.choice).toBe("warm");
    expect(result.answers.urgent.probability).toBe(0.2);
    expect(result.confidence).toEqual({ tone: 0.8 });
    expect(result.usage.inputTokens).toBe(120);
    expect(result.modelId).toBe("typesafe-ai/jev");
  });

  test("rejects gateway errors", async () => {
    const { fetch } = fakeFetch(
      () =>
        new Response(
          JSON.stringify({ error: { message: "credit balance required" } }),
          { status: 402 }
        )
    );
    const client = createEvaluationClient({ apiKey: "key_test", fetch });

    await expect(
      client.evaluate({ feature: "test", state: "x", questions: QUESTIONS })
    ).rejects.toThrow();
  });

  test("tryEvaluate returns null instead of throwing and skips when unavailable", async () => {
    const failing = createEvaluationClient({
      apiKey: "key_test",
      fetch: fakeFetch(() => new Response("nope", { status: 500 })).fetch,
    });
    expect(
      await failing.tryEvaluate({
        feature: "test",
        state: "x",
        questions: QUESTIONS,
        // The gateway retries the 500 until the abort fires; keep it short.
        timeoutMs: 50,
      })
    ).toBeNull();

    const { fetch, calls } = fakeFetch(() => Response.json(okBody));
    const disabled = createEvaluationClient({
      apiKey: "key_test",
      fetch,
      enabled: false,
    });
    expect(disabled.isAvailable()).toBe(false);
    expect(
      await disabled.tryEvaluate({
        feature: "test",
        state: "x",
        questions: QUESTIONS,
      })
    ).toBeNull();
    expect(calls).toHaveLength(0);
  });
});
