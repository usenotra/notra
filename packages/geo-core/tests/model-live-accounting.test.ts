import { afterAll, beforeAll, expect, mock, spyOn, test } from "bun:test";

import type { GatewayModelOptions } from "@notra/ai/types/gateway";
import type { RouteMetadata } from "@notra/ai/types/router";
import { generateText, Output } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { Effect } from "effect";

import {
  GEO_DISCOVERY_SYSTEM_PROMPT,
  GEO_JUDGE_MAX_TOKENS,
  GEO_JUDGE_MODEL,
} from "../src/constants/geo";
import {
  GSC_SUGGESTION_MAX_TOKENS,
  GSC_SUGGESTION_MODEL,
} from "../src/constants/google-search-console";
import { GeoModelService } from "../src/deps";
import { buildGscSuggestionPrompt } from "../src/geo/suggestion-prompt";
import { geoJudgeResultSchema } from "../src/schemas/geo";
import { geoSearchConsoleSuggestionSchema } from "../src/schemas/google-search-console";
import { agentTokenUsageFrom } from "../src/utils/token-usage";

let model = new MockLanguageModelV4();
let reportedCostUsd: number | undefined;
const routedModel = mock(
  (_modelId: string, _options: GatewayModelOptions) => model
);
const enrich = mock(async (route: RouteMetadata) => ({
  ...route,
  ...(reportedCostUsd === undefined
    ? {}
    : { costUsd: reportedCostUsd, costSource: "reported" as const }),
}));

mock.module("@notra/db/drizzle", () => ({
  db: new Proxy(
    {},
    {
      get: () => {
        throw new Error("Unexpected database access");
      },
    }
  ),
}));
const actualGateway = await import("@notra/ai/gateway");
mock.module("@notra/ai/gateway", () => ({
  ...actualGateway,
  gateway: routedModel,
  getRouteMetadata: () => ({
    gateway: "vercel" as const,
    requestedModel: GEO_JUDGE_MODEL,
    model: GEO_JUDGE_MODEL,
    reason: "paid" as const,
  }),
  enrichRouteMetadata: enrich,
}));

const { geoModelLive } = await import("../src/geo/model-live");
const network = spyOn(globalThis, "fetch");
beforeAll(() =>
  network.mockImplementation(() => {
    throw new Error("Unexpected network access");
  })
);
afterAll(() => network.mockRestore());

test.each([
  {
    name: "actual flex",
    tier: "flex",
    reported: undefined,
    expected: 0.0001675,
  },
  {
    name: "actual standard",
    tier: "default",
    reported: undefined,
    expected: 0.000335,
  },
  {
    name: "reported cost overrides flex estimate",
    tier: "flex",
    reported: 0.004321,
    expected: 0.004321,
  },
  {
    name: "reported zero overrides standard estimate",
    tier: "default",
    reported: 0,
    expected: 0,
  },
])("judge accounting: $name", async ({ tier, reported, expected }) => {
  const input = {
    organizationId: "judge-org",
    prompt:
      "Analyze this unchanged multilingual answer: Notra ist eine gute Wahl.",
    logContext: { projectId: "judge-project", scanId: "judge-scan" },
  };
  const output = {
    mentioned: true,
    position: 1,
    sentiment: "positive" as const,
    competitors: ["Other"],
    excerpt: "Notra ist eine gute Wahl.",
  };
  model = new MockLanguageModelV4({
    modelId: GEO_JUDGE_MODEL,
    doGenerate: {
      content: [{ type: "text", text: JSON.stringify(output) }],
      finishReason: { unified: "stop", raw: "stop" },
      usage: {
        inputTokens: {
          total: 1500,
          noCache: 1000,
          cacheRead: 500,
          cacheWrite: 0,
        },
        outputTokens: { total: 100, text: 80, reasoning: 20 },
      },
      providerMetadata: { gateway: { serviceTier: tier } },
      warnings: [],
    },
  });
  // Exact pre-change request, using the real SDK and an in-process model only.
  const baseline = await generateText({
    model,
    output: Output.object({ schema: geoJudgeResultSchema }),
    prompt: input.prompt,
    instructions:
      "You analyze AI assistant answers for brand mentions. Respond only with the requested structured data.",
    maxOutputTokens: 800,
    providerOptions: {
      gateway: { tags: ["geo-scan-judge"], serviceTier: "flex" },
    },
  });
  reportedCostUsd = reported;
  routedModel.mockClear();
  enrich.mockClear();
  const candidate = await Effect.runPromise(
    GeoModelService.pipe(
      Effect.flatMap((service) => service.judge(input)),
      Effect.provide(geoModelLive)
    )
  );

  expect(model.doGenerateCalls).toHaveLength(2); // One baseline, one candidate.
  expect({ ...model.doGenerateCalls[1], abortSignal: undefined }).toEqual({
    ...model.doGenerateCalls[0],
    abortSignal: undefined,
  });
  expect(model.doGenerateCalls[1]?.maxOutputTokens).toBe(GEO_JUDGE_MAX_TOKENS);
  expect(routedModel).toHaveBeenCalledTimes(1);
  expect(routedModel).toHaveBeenCalledWith(GEO_JUDGE_MODEL, {
    organizationId: input.organizationId,
    logContext: input.logContext,
  });
  expect(enrich).toHaveBeenCalledTimes(1);
  expect(candidate).toEqual({
    ...output,
    usage: {
      ...baseline.usage,
      modelId: GEO_JUDGE_MODEL,
      route: expect.objectContaining({
        gateway: "vercel",
        model: GEO_JUDGE_MODEL,
      }),
      totalUsd: candidate.usage?.totalUsd,
    },
  });
  // Accounting comparison: identical tokens/requests; no inference savings.
  expect(
    agentTokenUsageFrom({ ...baseline.usage, modelId: GEO_JUDGE_MODEL })
      .totalUsd
  ).toBeCloseTo(0.000335, 12);
  expect(agentTokenUsageFrom(candidate.usage).totalUsd).toBeCloseTo(
    expected,
    12
  );
  expect(network).not.toHaveBeenCalled();
});

test("GSC suggestions attribute the organization without adding it to model text", async () => {
  const input = {
    organizationId: "gsc-org",
    companyName: "Example",
    companyDescription: "Email tooling",
    competitors: ["Other"],
    siteUrl: "https://example.com",
    keywords: [
      { query: "email tools", clicks: 4, impressions: 120, position: 6 },
    ],
    existingPrompts: ["How can a small team send email?"],
  };
  model = new MockLanguageModelV4({
    modelId: GSC_SUGGESTION_MODEL,
    doGenerate: {
      content: [{ type: "text", text: JSON.stringify({ prompts: [] }) }],
      finishReason: { unified: "stop", raw: "stop" },
      usage: {
        inputTokens: { total: 100, noCache: 100, cacheRead: 0, cacheWrite: 0 },
        outputTokens: { total: 5, text: 5, reasoning: 0 },
      },
      warnings: [],
    },
  });
  await generateText({
    model,
    output: Output.object({ schema: geoSearchConsoleSuggestionSchema }),
    instructions: GEO_DISCOVERY_SYSTEM_PROMPT,
    prompt: buildGscSuggestionPrompt(input),
    maxOutputTokens: GSC_SUGGESTION_MAX_TOKENS,
    providerOptions: { gateway: { tags: ["geo-discovery"] } },
  });
  routedModel.mockClear();
  const result = await Effect.runPromise(
    GeoModelService.pipe(
      Effect.flatMap((service) => service.suggest(input)),
      Effect.provide(geoModelLive)
    )
  );

  expect(result.prompts).toEqual([]);
  expect(routedModel).toHaveBeenCalledTimes(1);
  expect(routedModel).toHaveBeenCalledWith(GSC_SUGGESTION_MODEL, {
    organizationId: input.organizationId,
  });
  expect(model.doGenerateCalls).toHaveLength(2);
  expect({ ...model.doGenerateCalls[1], abortSignal: undefined }).toEqual({
    ...model.doGenerateCalls[0],
    abortSignal: undefined,
  });
  expect(model.doGenerateCalls[1]).toMatchObject({
    maxOutputTokens: GSC_SUGGESTION_MAX_TOKENS,
    providerOptions: { gateway: { tags: ["geo-discovery"] } },
    prompt: [
      { role: "system", content: GEO_DISCOVERY_SYSTEM_PROMPT },
      {
        role: "user",
        content: [{ type: "text", text: buildGscSuggestionPrompt(input) }],
      },
    ],
  });
  expect(buildGscSuggestionPrompt(input)).toBe(
    buildGscSuggestionPrompt({ ...input, organizationId: "another-org" })
  );
  expect(network).not.toHaveBeenCalled();
});
