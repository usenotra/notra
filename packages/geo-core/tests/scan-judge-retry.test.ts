import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "bun:test";

import { geoMentionChecks, geoScans } from "@notra/db/schema";
import { Effect } from "effect";

import { GeoFeatureFlagService, GeoModelService } from "../src/deps";
import { GeoJudgeError, GeoScanError } from "../src/geo/errors";
import {
  fakeModels,
  testBillingGate,
  testFeatureFlags,
} from "./constants/geo-boundaries";
import {
  database,
  initializeDatabase,
  resetDatabase,
  seedProject,
  testDb,
} from "./utils/database";
import "./utils/infrastructure";

const { runGeoScanTaskBatch } = await import("../src/geo/scan");

beforeAll(initializeDatabase, 30_000);
afterAll(() => database.postgres.close());
beforeEach(resetDatabase);

describe("GEO judge retry boundary", () => {
  test.each([
    { failure: "timeout-once", grounded: false, judges: 2, checks: 1 },
    { failure: "timeout-once", grounded: true, judges: 2, checks: 1 },
    { failure: "timeout-always", grounded: false, judges: 2, checks: 0 },
    { failure: "refusal", grounded: false, judges: 1, checks: 0 },
  ])(
    "$failure (grounded=$grounded) retains the engine answer",
    async (scenario) => {
      const scope = await seedProject("judge-retry");
      await testDb.insert(geoScans).values({ id: "retry-scan", ...scope });
      let answers = 0;
      let judges = 0;
      const answer = () =>
        Effect.sync(() => {
          answers += 1;
          return {
            text: "Notra is a content platform.",
            grounding: { queries: [], sources: [] },
            sources: [],
            finishReason: "stop" as const,
            zdrEnforced: null,
            usage: {
              inputTokens: 100,
              inputTokenDetails: {
                noCacheTokens: 100,
                cacheReadTokens: 0,
                cacheWriteTokens: 0,
              },
              outputTokens: 20,
              outputTokenDetails: { textTokens: 20, reasoningTokens: 0 },
              totalTokens: 120,
              modelId: "openai/gpt-5.6-sol",
            },
          };
        });

      const result = await Effect.runPromise(
        runGeoScanTaskBatch(
          {
            ...scope,
            scanId: "retry-scan",
            runId: "retry-run",
            companyName: "Notra",
            aliases: [],
            gate: testBillingGate,
            startedAtMs: Date.now(),
          },
          [
            {
              engine: scenario.grounded
                ? "openai/gpt-5.6-sol-grounded"
                : "openai/gpt-5.6-sol",
              groundedKey: scenario.grounded
                ? "openai/gpt-5.6-sol-grounded"
                : null,
              prompt: {
                id: "retry-prompt",
                text: "Which content platform should I choose?",
              },
              language: "English",
              zdr: "none",
            },
          ]
        ).pipe(
          Effect.provideService(GeoModelService, {
            ...fakeModels,
            answer,
            groundedAnswer: answer,
            judge: () =>
              Effect.suspend(() => {
                judges += 1;
                if (
                  scenario.failure === "timeout-always" ||
                  scenario.failure === "refusal" ||
                  judges === 1
                ) {
                  return Effect.fail(
                    new GeoJudgeError({
                      message: "Judge failed",
                      cause: new Error("Judge failed"),
                      timedOut: scenario.failure !== "refusal",
                    })
                  );
                }
                return fakeModels.judge({
                  organizationId: scope.organizationId,
                  prompt: "",
                });
              }),
          }),
          Effect.provideService(GeoFeatureFlagService, testFeatureFlags)
        )
      );

      expect(answers).toBe(1);
      expect(judges).toBe(scenario.judges);
      expect(result.checks).toBe(scenario.checks);
      expect(result.dropped).toBe(1 - scenario.checks);
      expect(result.engineUsage?.inputTokens).toBe(100);
      expect(result.engineUsage?.outputTokens).toBe(20);
      const rows = await testDb.select().from(geoMentionChecks);
      expect(rows).toHaveLength(scenario.checks);
      if (scenario.checks) {
        expect(rows[0]?.answer).toBe("Notra is a content platform.");
        expect(rows[0]?.promptId).toBe("retry-prompt");
        expect(rows[0]?.engine).toBe(
          scenario.grounded
            ? "openai/gpt-5.6-sol-grounded"
            : "openai/gpt-5.6-sol"
        );
      }
    }
  );

  test("engine timeouts still retry the engine once", async () => {
    const scope = await seedProject("answer-retry");
    await testDb.insert(geoScans).values({ id: "retry-scan", ...scope });
    let answers = 0;
    const result = await Effect.runPromise(
      runGeoScanTaskBatch(
        {
          ...scope,
          scanId: "retry-scan",
          runId: "retry-run",
          companyName: "Notra",
          aliases: [],
          gate: testBillingGate,
          startedAtMs: Date.now(),
        },
        [
          {
            engine: "openai/gpt-5.6-sol",
            groundedKey: null,
            prompt: { id: "retry-prompt", text: "Which tools?" },
            language: "English",
            zdr: "none",
          },
        ]
      ).pipe(
        Effect.provideService(GeoModelService, {
          ...fakeModels,
          answer: (input) =>
            Effect.suspend(() => {
              answers += 1;
              return answers === 1
                ? Effect.fail(
                    new GeoScanError({
                      message: "Engine timeout",
                      timedOut: true,
                    })
                  )
                : fakeModels.answer(input);
            }),
        }),
        Effect.provideService(GeoFeatureFlagService, testFeatureFlags)
      )
    );
    expect(answers).toBe(2);
    expect(result.checks).toBe(1);
  });
});
