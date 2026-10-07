import { afterEach, describe, expect, test } from "bun:test";

import { setModelRouter } from "@notra/ai/gateway";
import {
  createFakeAdapter,
  createTestRouter,
} from "@notra/ai/router/test-helpers";
import { Effect } from "effect";

import { GeoModelService } from "../src/deps";
import { geoModelLive } from "../src/geo/model-live";
import type { GeoGroundedEngine } from "../src/types/geo";

afterEach(() => setModelRouter(null));

describe("GEO model attribution through the real SDK", () => {
  test("grounded answers retain scan attribution, citations and the filtered search tool", async () => {
    const vercel = createFakeAdapter({ id: "vercel" });
    const createModel = vercel.createModel;
    vercel.createModel = (modelId) => {
      const model = createModel(modelId);
      const generate = model.doGenerate.bind(model);
      model.doGenerate = async (options) => {
        const result = await generate(options);
        return {
          ...result,
          content: [
            { type: "text", text: "A cited answer." },
            {
              type: "source",
              sourceType: "url",
              id: "source",
              url: "https://example.com/article",
              title: "Article",
            },
          ],
        };
      };
      return model;
    };
    const { router, logger } = createTestRouter({ vercel });
    setModelRouter(router);
    const engine: GeoGroundedEngine = {
      key: "anthropic/claude-opus-5.5-grounded",
      model: "anthropic/claude-opus-5.5",
      label: "Claude Opus 5.5",
      provider: "gateway-anthropic",
      zdr: "some",
      envVar: null,
      isAvailable: () => true,
    };
    const logContext = {
      projectId: "project",
      scanId: "scan",
      runId: "run",
      promptId: "best-tools",
    };
    const answer = await Effect.runPromise(
      GeoModelService.pipe(
        Effect.flatMap((service) =>
          service.groundedAnswer({
            organizationId: "org-test",
            engine,
            messages: [{ role: "user", content: "Which tools?" }],
            zdr: "none",
            logContext,
          })
        ),
        Effect.provide(geoModelLive)
      )
    );
    expect(answer.sources).toEqual([
      { url: "https://example.com/article", title: "Article" },
    ]);
    expect(vercel.calls[0]?.options.tools).toContainEqual(
      expect.objectContaining({
        type: "provider",
        id: "anthropic.web_search_20260318",
        args: { maxUses: 3, responseInclusion: "excluded" },
      })
    );
    expect(vercel.calls[0]?.options.providerOptions?.gateway?.user).toBe(
      "org-test"
    );
    expect(
      vercel.calls[0]?.options.providerOptions?.gateway?.models
    ).toBeUndefined();
    expect(
      logger.entries.find((entry) => entry.event === "ai.call.completed")
        ?.fields
    ).toMatchObject({
      ...logContext,
      generationId: "gen_test",
      tags: ["geo-scan-grounded"],
    });
  });

  test("plain answers and Nano judgments inherit the same scan context", async () => {
    const vercel = createFakeAdapter({ id: "vercel" });
    const createModel = vercel.createModel;
    vercel.createModel = (modelId) => {
      const model = createModel(modelId);
      const generate = model.doGenerate.bind(model);
      model.doGenerate = async (options) => {
        const result = await generate(options);
        return options.responseFormat?.type === "json"
          ? {
              ...result,
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    mentioned: false,
                    position: null,
                    sentiment: null,
                    competitors: [],
                    excerpt: "",
                  }),
                },
              ],
            }
          : result;
      };
      return model;
    };
    const { router, logger } = createTestRouter({
      vercel,
      plans: { "org-test": "paid" },
    });
    setModelRouter(router);
    const service = await Effect.runPromise(
      GeoModelService.pipe(Effect.provide(geoModelLive))
    );
    const logContext = {
      projectId: "project",
      scanId: "scan",
      runId: "run",
      promptId: "best-tools",
    };
    const answer = await Effect.runPromise(
      service.answer({
        organizationId: "org-test",
        engine: "openai/gpt-6-sol",
        prompt: "Which tools?",
        zdr: "none",
        gateway: "vercel",
        logContext,
      })
    );
    await Effect.runPromise(
      service.judge({
        organizationId: "org-test",
        prompt: answer.text,
        logContext,
      })
    );
    const completed = logger.entries.filter(
      (entry) => entry.event === "ai.call.completed"
    );
    expect(completed).toHaveLength(2);
    for (const entry of completed) {
      expect(entry.fields).toMatchObject(logContext);
    }
    expect(completed[0]?.fields?.tags).toEqual(["geo-scan-plain"]);
    expect(completed[1]?.fields?.tags).toEqual(["geo-scan-judge"]);
    expect(
      vercel.calls.every(
        (call) => call.options.providerOptions?.gateway?.user === "org-test"
      )
    ).toBe(true);
  });
});
