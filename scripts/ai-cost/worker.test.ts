import { mock, test } from "bun:test";
import assert from "node:assert/strict";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import type { GeoModelServiceShape } from "../../packages/geo-core/src/types/model";
import {
  ACCOUNTING_FIXTURE,
  CACHE_PHASES,
  FEEDBACK_FIXTURES,
  FEEDBACK_INPUT,
  FEEDBACK_OUTPUT,
  GEO_CONTEXT,
  GEO_FIXTURES,
  PREFIX_MESSAGES,
  REFERENCE_FIXTURE,
} from "./constants/fixtures";
import type {
  BenchmarkResult,
  EvaluationWireCall,
  ProviderCall,
  RecordedCall,
} from "./types/benchmark";
import {
  jsonBytes,
  measureCall,
  sha256,
  sharedPrefixBytes,
} from "./utils/measure";

const root = process.env.NOTRA_AI_COST_ROOT;
const output = process.env.NOTRA_AI_COST_OUTPUT;

test.skipIf(!root || !output)(
  "offline AI cost production boundaries",
  async () => {
    assert.ok(root && output);
    const source = (relative: string) => join(root, relative);
    const load = (relative: string) =>
      import(pathToFileURL(source(relative)).href);
    let networkAttempts = 0;
    const blockNetwork = () => {
      networkAttempts++;
      throw new Error("Network is forbidden in the offline AI cost benchmark");
    };
    globalThis.fetch = Object.assign(blockNetwork, {
      preconnect: blockNetwork,
    });

    const { ROUTER_METADATA_KEY } = await load(
      "packages/ai/src/constants/router.ts"
    );
    const logs: unknown[] = [];
    mock.module(source("packages/ai/src/utils/server-log.ts"), () => ({
      logError: (...args: unknown[]) => logs.push(args),
      logInfo: () => undefined,
      logWarn: () => undefined,
    }));
    mock.module(source("packages/ai/src/evlog.ts"), () => ({
      log: {
        info: () => undefined,
        warn: () => undefined,
        error: () => undefined,
      },
      geoLog: {
        info: () => undefined,
        warn: () => undefined,
        error: () => undefined,
      },
      geoLogDrainEnabled: false,
      flushGeoLog: async () => undefined,
    }));

    const { createFakeAdapter } = await load(
      "packages/ai/src/router/test-helpers.ts"
    );
    const adapter = createFakeAdapter({ id: "vercel" });
    const model = adapter.createModel("offline-fixture-model");
    const generate = model.doGenerate;
    model.doGenerate = async (options: ProviderCall) => ({
      ...(await generate(options)),
      content: [{ type: "text", text: JSON.stringify(FEEDBACK_OUTPUT) }],
    });
    mock.module(source("packages/ai/src/gateway.ts"), () => ({
      gateway: () => model,
      getRouteMetadata: (metadata: Record<string, unknown> | undefined) =>
        metadata?.[ROUTER_METADATA_KEY],
      enrichRouteMetadata: async (metadata: unknown) => metadata,
    }));

    let evaluationAvailable = true;
    const evaluations: EvaluationWireCall[] = [];
    const { createEvaluationClient, setEvaluationClient } = await load(
      "packages/ai/src/evaluation/client.ts"
    );
    setEvaluationClient(
      createEvaluationClient({
        apiKey: "offline-fixture-key",
        baseURL: "https://benchmark.invalid",
        enabled: true,
        fetch: async (url: unknown, init?: RequestInit) => {
          assert.equal(
            String(url),
            "https://benchmark.invalid/evaluation-model"
          );
          const payload: EvaluationWireCall = JSON.parse(String(init?.body));
          evaluations.push(payload);
          return Response.json({
            answers: evaluationAvailable
              ? Object.fromEntries(
                  Object.keys(payload.questions).map((key) => [
                    key,
                    {
                      type: "choice",
                      choice: key === "kind" ? "bug" : "negative",
                    },
                  ])
                )
              : {},
          });
        },
      })
    );

    const { classifyAgentFeedback } = await load(
      "packages/ai/src/jobs/feedback-classifier.ts"
    );
    const { Effect } = await import(
      Bun.resolveSync("effect", source("packages/geo-core"))
    );
    const { submitFeedback } = await load("apps/api/src/programs/feedback.ts");
    const db = {
      insert: () => ({
        values: (values: Record<string, unknown>) => ({
          onConflictDoNothing: () => ({ returning: async () => [values] }),
        }),
      }),
    };
    const feedback: Record<string, unknown> = {};
    for (const fixture of FEEDBACK_FIXTURES) {
      evaluationAvailable = fixture.evaluationAvailable;
      adapter.calls.length = 0;
      evaluations.length = 0;
      const submitted = await Effect.runPromise(
        submitFeedback({
          db,
          organizationId: FEEDBACK_INPUT.organizationId,
          body: {
            source: "api",
            message: FEEDBACK_INPUT.message,
            contextUrl: FEEDBACK_INPUT.contextUrl,
            agentClient: FEEDBACK_INPUT.agentClient,
            ...fixture.suppliedFields,
          },
        })
      );
      assert.equal(submitted.deduplicated, false);
      const result = {
        title: submitted.feedback.title,
        kind: submitted.feedback.kind,
        sentiment: submitted.feedback.sentiment,
      };
      assert.deepEqual(result, FEEDBACK_OUTPUT, fixture.id);
      if (fixture.id === "supplied-all") {
        assert.equal(
          adapter.calls.length,
          0,
          "API admission already bypasses the LLM when all fields are supplied"
        );
        assert.equal(
          evaluations.length,
          0,
          "API admission already bypasses evaluation when all fields are supplied"
        );
      }
      feedback[fixture.id] = {
        boundary:
          "submitFeedback API program with in-memory insert; real admission guard and classifier",
        llmProviderCalls: adapter.calls.length,
        evaluatorProviderCalls: evaluations.length,
        evaluatedQuestions: evaluations.flatMap((call) =>
          Object.keys(call.questions)
        ),
        evaluatorInputJsonBytes: evaluations.reduce(
          (sum, call) =>
            sum + jsonBytes(call.state) + jsonBytes(call.questions),
          0
        ),
        outboundCalls: adapter.calls.map((call: RecordedCall) =>
          measureCall(call.options)
        ),
        result,
      };
    }
    assert.deepEqual(logs, [], "classification unexpectedly failed");

    // Same production call with two feedback bodies: measure prefix eligibility,
    // not observed provider cache hits. IDs/URLs do not alter the system prompt.
    evaluationAvailable = false;
    adapter.calls.length = 0;
    for (const message of PREFIX_MESSAGES) {
      await classifyAgentFeedback({ ...FEEDBACK_INPUT, message });
    }
    assert.equal(adapter.calls.length, 2);
    const first: ProviderCall = adapter.calls[0].options;
    const second: ProviderCall = adapter.calls[1].options;
    const prefix = {
      sharedPromptJsonPrefixBytes: sharedPrefixBytes(
        JSON.stringify(first.prompt),
        JSON.stringify(second.prompt)
      ),
      systemPrefixStable:
        measureCall(first).systemSha256 === measureCall(second).systemSha256,
      calls: [measureCall(first), measureCall(second)],
    };
    assert.equal(prefix.systemPrefixStable, true);

    const { serializeBrandReference } = await load(
      "packages/ai/src/utils/brand-references.ts"
    );
    const reference = serializeBrandReference(REFERENCE_FIXTURE);
    assert.equal(reference.content, REFERENCE_FIXTURE.content);
    assert.equal(reference.note, REFERENCE_FIXTURE.note);
    const references = {
      payloadJsonBytes: jsonBytes(reference),
      includesSnapshotLocator: "sourceSnapshotKey" in reference,
      includesSourceUrl: "sourceUrl" in reference,
    };

    const { getAICachedTools } = await load(
      "packages/ai/src/tools/tool-cache.ts"
    );
    const store = new Map<string, unknown>();
    let phase: (typeof CACHE_PHASES)[number] = "cold";
    let executions = 0;
    const cached = getAICachedTools({
      organizationId: "org_benchmark",
      namespace: "benchmark",
      redis: {
        get: async (key: string) => {
          if (phase === "read-outage") {
            throw new Error("Synthetic Redis GET failure");
          }
          return store.get(key) ?? null;
        },
        set: async (key: string, value: unknown) => {
          if (phase === "write-outage") {
            throw new Error("Synthetic Redis SET failure");
          }
          store.set(key, value);
        },
      },
    })({
      execute: async () => {
        executions++;
        return { content: REFERENCE_FIXTURE.content };
      },
    });
    const cache: Record<string, unknown> = {};
    for (const next of CACHE_PHASES) {
      phase = next;
      if (phase === "write-outage" || phase === "recovered-cold") {
        store.clear();
      }
      const before = executions;
      try {
        assert.equal(
          (await cached.execute({ query: "exports" }, {})).content,
          REFERENCE_FIXTURE.content
        );
        cache[phase] = {
          status: "success",
          toolExecutions: executions - before,
        };
      } catch (error) {
        assert.ok(
          error instanceof Error && error.message.startsWith("Synthetic Redis")
        );
        cache[phase] = {
          status: "redis-error",
          toolExecutions: executions - before,
        };
      }
    }
    assert.deepEqual(cache["recovered-cold"], {
      status: "success",
      toolExecutions: 1,
    });
    assert.deepEqual(cache["recovered-warm"], {
      status: "success",
      toolExecutions: 0,
    });

    const { summarizeRouteUsage } = await load(
      "packages/ai/src/utils/route-usage.ts"
    );
    const { calculateTokenCostUsd } = await load(
      "packages/ai/src/billing/token-pricing.ts"
    );
    const steps = [
      ACCOUNTING_FIXTURE.reportedRoute,
      ACCOUNTING_FIXTURE.estimatedRoute,
    ].map((route) => ({
      providerMetadata: { [ROUTER_METADATA_KEY]: route },
      usage: ACCOUNTING_FIXTURE.usage,
    }));
    const accounting = await summarizeRouteUsage(
      steps,
      ACCOUNTING_FIXTURE.modelId
    );
    assert.equal(accounting.tokenCostUsd, 0.42 + 0.525);
    const reversed = await summarizeRouteUsage(
      [...steps].reverse(),
      ACCOUNTING_FIXTURE.modelId
    );
    assert.equal(reversed.tokenCostUsd, accounting.tokenCostUsd);
    const pricing = {
      label:
        "Modeled costs for synthetic token inputs using each revision's pricing table; not measured spend",
      standardUsd: calculateTokenCostUsd(
        ACCOUNTING_FIXTURE.usage,
        ACCOUNTING_FIXTURE.modelId,
        "vercel"
      ),
      flexUsd: calculateTokenCostUsd(
        ACCOUNTING_FIXTURE.usage,
        ACCOUNTING_FIXTURE.modelId,
        "vercel",
        "flex"
      ),
      flexOpenrouterUsd: calculateTokenCostUsd(
        ACCOUNTING_FIXTURE.usage,
        ACCOUNTING_FIXTURE.modelId,
        "openrouter",
        "flex"
      ),
    };
    assert.equal(pricing.standardUsd, 0.525);
    assert.equal(pricing.flexUsd, pricing.standardUsd / 2);
    assert.equal(pricing.flexOpenrouterUsd, pricing.standardUsd);
    const { GeoModelService } = await load("packages/geo-core/src/deps.ts");
    const { judgeAnswer } = await load(
      "packages/geo-core/src/geo/check-evaluation.ts"
    );
    let judgedChecks = 0;
    let evaluatedMentions = 0;
    const judgePrompts: string[] = [];
    const geoResults = [];
    const models = {
      judge: (input: Parameters<GeoModelServiceShape["judge"]>[0]) => {
        const fixture = GEO_FIXTURES[judgedChecks];
        assert.ok(fixture, "unexpected additional GEO judge call");
        judgedChecks++;
        judgePrompts.push(input.prompt);
        return Effect.succeed({
          mentioned: fixture.mentioned,
          position: 1,
          sentiment: "positive",
          competitors: [],
          excerpt: fixture.answer,
        });
      },
      evaluateMention: () => {
        evaluatedMentions++;
        return Effect.succeed({
          sentiment: "positive",
          position: 1,
          confidence: {},
        });
      },
    };
    for (const fixture of GEO_FIXTURES) {
      const result = await Effect.runPromise(
        judgeAnswer(GEO_CONTEXT, fixture.prompt, fixture.answer).pipe(
          Effect.provideService(GeoModelService, models)
        )
      );
      assert.equal(result.mentioned, fixture.mentioned);
      geoResults.push({
        mentioned: result.mentioned,
        sentiment: result.sentiment,
        position: result.position,
      });
    }
    assert.equal(judgedChecks, GEO_FIXTURES.length);
    assert.equal(evaluatedMentions, 2);
    const geo = {
      completedJudgeContexts: geoResults.length,
      judgeBoundaryCalls: judgedChecks,
      evaluatorBoundaryCalls: evaluatedMentions,
      judgePromptUtf8Bytes: judgePrompts.map((prompt) =>
        Buffer.byteLength(prompt)
      ),
      results: geoResults,
    };
    assert.equal(networkAttempts, 0);

    const sourceHashInput: string[] = [];
    for (const directory of [
      "packages/ai/src",
      "packages/geo-core/src",
      "apps/api/src",
    ]) {
      const filenames = (await readdir(source(directory), { recursive: true }))
        .filter((name) => name.endsWith(".ts") && !name.endsWith(".test.ts"))
        .sort();
      sourceHashInput.push(
        ...(await Promise.all(
          filenames.map(
            async (name) =>
              `${directory}/${name}\n${await readFile(source(`${directory}/${name}`), "utf8")}`
          )
        ))
      );
    }
    const aiPackage = JSON.parse(
      await readFile(source("packages/ai/node_modules/ai/package.json"), "utf8")
    );
    const providerPackage = JSON.parse(
      await readFile(
        source("packages/ai/node_modules/@ai-sdk/provider/package.json"),
        "utf8"
      )
    );
    const report: BenchmarkResult = {
      fixtureSha256: sha256(
        JSON.stringify({
          FEEDBACK_FIXTURES,
          FEEDBACK_INPUT,
          FEEDBACK_OUTPUT,
          REFERENCE_FIXTURE,
          ACCOUNTING_FIXTURE,
          CACHE_PHASES,
          GEO_FIXTURES,
          GEO_CONTEXT,
          PREFIX_MESSAGES,
        })
      ),
      sourceSha256: sha256(sourceHashInput.join("\n")),
      runtime: {
        bun: Bun.version,
        ai: aiPackage.version,
        provider: providerPackage.version,
        lockfileSha256: sha256(await readFile(source("bun.lock"), "utf8")),
      },
      measurements: {
        feedback,
        prefix,
        references,
        cache,
        geo,
        syntheticAccounting: accounting,
        syntheticPricing: pricing,
        networkAttempts,
      },
    };
    await writeFile(output, JSON.stringify(report, null, 2));
  },
  30_000
);
