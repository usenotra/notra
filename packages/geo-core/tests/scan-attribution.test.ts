import "./utils/infrastructure";
import { afterAll, beforeAll, beforeEach, expect, mock, test } from "bun:test";

import { geoScans } from "@notra/db/schema";
import { Effect } from "effect";

import { GEO_DEMO_USAGE } from "../src/constants/geo-demo";
import { GeoFeatureFlagService, GeoModelService } from "../src/deps";
import { resolveGroundedEngineByKey } from "../src/utils/geo-grounded-engines";
import { seedGeoModelCatalog } from "../src/utils/geo-model-catalog";
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

const { runGeoConversation } = await import("../src/geo/conversation");
const { runGeoScanTaskBatch } = await import("../src/geo/scan");

beforeAll(initializeDatabase, 30_000);
beforeEach(resetDatabase);
afterAll(() => database.postgres.close());

test("parallel scan tasks pass their prompt and scan IDs to answers and judgments", async () => {
  const scope = await seedProject("attribution");
  await testDb.insert(geoScans).values({ id: "scan-test", ...scope });
  const answer = mock(fakeModels.answer);
  const groundedAnswer = mock(
    (input: Parameters<typeof fakeModels.groundedAnswer>[0]) =>
      fakeModels
        .answer({
          organizationId: input.organizationId,
          engine: input.engine.model,
          prompt: "mock",
          gateway: undefined,
          zdr: input.zdr,
        })
        .pipe(
          Effect.map((result) => ({
            ...result,
            usage: GEO_DEMO_USAGE,
          }))
        )
  );
  const judge = mock(fakeModels.judge);
  const outcome = await Effect.runPromise(
    runGeoScanTaskBatch(
      {
        ...scope,
        scanId: "scan-test",
        runId: "run-test",
        companyName: "Selected",
        aliases: [],
        gate: testBillingGate,
        startedAtMs: Date.now(),
      },
      [
        {
          engine: "openai/gpt-6-sol",
          groundedKey: null,
          prompt: { id: "plain", text: "Which tools?" },
          language: "English",
          zdr: "none",
        },
        {
          engine: "anthropic/claude-opus-5.5-grounded",
          groundedKey: "anthropic/claude-opus-5.5-grounded",
          prompt: { id: "grounded", text: "Which alternatives?" },
          language: "English",
          zdr: "none",
        },
      ]
    ).pipe(
      Effect.provideService(GeoModelService, {
        ...fakeModels,
        answer,
        groundedAnswer,
        judge,
      }),
      Effect.provideService(GeoFeatureFlagService, testFeatureFlags)
    )
  );
  expect(outcome.checks).toBe(2);
  const expected = {
    projectId: scope.projectId,
    scanId: "scan-test",
    runId: "run-test",
  };
  expect(answer.mock.calls[0]?.[0].logContext).toEqual({
    ...expected,
    promptId: "plain",
  });
  expect(groundedAnswer.mock.calls[0]?.[0].logContext).toEqual({
    ...expected,
    promptId: "grounded",
  });
  expect(
    judge.mock.calls.map(([input]) => input.logContext?.promptId).sort()
  ).toEqual(["grounded", "plain"]);
  for (const [input] of judge.mock.calls) {
    expect(input.logContext).toMatchObject(expected);
  }
});

test("conversation turns preserve prompt attribution on answers and judgments", async () => {
  const scope = await seedProject("conversation-attribution");
  const engine = resolveGroundedEngineByKey(
    "anthropic/claude-opus-5.5-grounded"
  );
  if (!engine) {
    throw new Error("Expected an Anthropic grounded engine");
  }
  const groundedAnswer = mock(
    (input: Parameters<typeof fakeModels.groundedAnswer>[0]) =>
      fakeModels
        .answer({
          organizationId: input.organizationId,
          engine: input.engine.model,
          prompt: "mock",
          gateway: undefined,
          zdr: input.zdr,
        })
        .pipe(
          Effect.map((result) => ({
            ...result,
            usage: GEO_DEMO_USAGE,
          }))
        )
  );
  const judge = mock(fakeModels.judge);
  const result = await Effect.runPromise(
    runGeoConversation(
      {
        ...scope,
        catalog: seedGeoModelCatalog(),
        scanId: "scan-test",
        runId: "run-test",
        capturedAt: new Date(),
        companyName: "Selected",
        aliases: [],
      },
      {
        promptId: "sequence-test",
        prompts: ["Which tools?", "Why?"],
        timeoutMs: 5000,
      },
      engine,
      "none"
    ).pipe(
      Effect.provideService(GeoModelService, {
        ...fakeModels,
        groundedAnswer,
        judge,
      })
    )
  );
  expect(result.rows).toHaveLength(2);
  for (const calls of [groundedAnswer.mock.calls, judge.mock.calls]) {
    expect(calls.map(([input]) => input.logContext?.turn)).toEqual([1, 2]);
    for (const [input] of calls) {
      expect(input.logContext).toMatchObject({
        projectId: scope.projectId,
        scanId: "scan-test",
        runId: "run-test",
        promptId: "sequence-test",
      });
    }
  }
});
