import "./utils/infrastructure";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  spyOn,
  test,
} from "bun:test";

import { geoLog } from "@notra/ai/evlog";
import { geoMentionChecks, geoScans } from "@notra/db/schema";
import { Effect } from "effect";

import { GEO_SEQUENCE_MAX_TURNS } from "../src/constants/geo";
import { GeoModelService, GeoFeatureFlagService } from "../src/deps";
import { GeoScanError } from "../src/geo/errors";
import type { GeoScanPlannedSequence } from "../src/types/geo";
import { geoScanPlanSnapshot } from "../src/utils/geo-scan-plan";
import {
  fakeModels,
  testBillingGate,
  testFeatureFlags,
} from "./constants/geo-boundaries";
import {
  initializeDatabase,
  resetDatabase,
  database,
  seedProject,
  testDb,
} from "./utils/database";
const { runGeoScanTaskBatch, runGeoScanSequenceBatch } =
  await import("../src/geo/scan");
const { loadGeoScanRun } = await import("../src/geo/scan-history");

beforeAll(initializeDatabase, 30_000);
afterAll(() => database.postgres.close());
beforeEach(resetDatabase);

describe("model service in real scan batches", () => {
  test("sequence turns move from queued to running to saved or failed independently", async () => {
    const scope = await seedProject("sequence-progress");
    const context = {
      ...scope,
      scanId: "sequence-scan",
      runId: "test",
      companyName: "Selected",
      aliases: [],
      gate: testBillingGate,
      startedAtMs: Date.now(),
    };
    const sequences: GeoScanPlannedSequence[] = [
      {
        sequenceId: "conversation",
        engine: "openai/gpt-4o-mini-grounded",
        groundedKey: "openai/gpt-4o-mini-grounded",
        zdr: "none",
        steps: Array.from(
          { length: GEO_SEQUENCE_MAX_TURNS + 1 },
          (_, index) => `Question ${index}`
        ),
      },
      {
        sequenceId: "unavailable",
        engine: "unavailable",
        groundedKey: "unavailable",
        zdr: "none",
        steps: ["Unavailable question"],
      },
    ];
    const plan = geoScanPlanSnapshot({
      context,
      claimedAt: new Date().toISOString(),
      tasks: [],
      sequences,
      promptCount: 0,
      engines: sequences.map((sequence) => sequence.engine),
      languages: ["English"],
    });
    expect(plan.tasks).toHaveLength(GEO_SEQUENCE_MAX_TURNS + 1);
    expect(new Set(plan.tasks?.map((task) => task.key)).size).toBe(
      plan.totalChecks
    );
    await testDb
      .insert(geoScans)
      .values({ ...scope, id: context.scanId, plan });
    const queued = await Effect.runPromise(
      loadGeoScanRun({ ...context, offset: 0 })
    );
    expect(queued?.pendingTotal).toBe(plan.totalChecks);
    expect(queued?.pending.every((task) => task.status === "queued")).toBe(
      true
    );
    let calls = 0;
    const result = await Effect.runPromise(
      runGeoScanSequenceBatch(context, sequences).pipe(
        Effect.provideService(GeoFeatureFlagService, testFeatureFlags),
        Effect.provideService(GeoModelService, {
          ...fakeModels,
          groundedAnswer: () =>
            Effect.gen(function* () {
              calls += 1;
              const active = yield* loadGeoScanRun({
                ...context,
                offset: 0,
              }).pipe(Effect.orDie);
              expect(
                active?.pending
                  .filter((task) => task.sequenceId === "conversation")
                  .every((task) => task.status === "running")
              ).toBe(true);
              return {
                text: calls === 1 ? "Selected is a good choice." : "",
                grounding: { queries: [], sources: [] },
                sources: [],
                finishReason: "stop",
                zdrEnforced: false,
                usage: {
                  inputTokens: 1,
                  outputTokens: 1,
                  totalTokens: 2,
                  inputTokenDetails: {
                    noCacheTokens: 1,
                    cacheReadTokens: 0,
                    cacheWriteTokens: 0,
                  },
                  outputTokenDetails: { textTokens: 1, reasoningTokens: 0 },
                },
              };
            }),
        })
      )
    );
    expect(calls).toBe(2);
    expect(result.checks).toBe(1);
    expect(result.dropped).toBe(plan.totalChecks - 1);
    const finished = await Effect.runPromise(
      loadGeoScanRun({ ...context, offset: 0 })
    );
    expect(finished?.total).toBe(1);
    expect(finished?.results[0]?.turn).toBe(1);
    expect(finished?.pendingTotal).toBe(plan.totalChecks - 1);
    expect(finished?.pending.every((task) => task.status === "failed")).toBe(
      true
    );
    expect(
      finished?.pending
        .filter((task) => task.sequenceId === "conversation")
        .map((task) => task.turn)
    ).toEqual(
      Array.from(
        { length: GEO_SEQUENCE_MAX_TURNS - 1 },
        (_, index) => index + 2
      )
    );
  });

  test("a failed progress write cannot discard a successful sibling answer", async () => {
    const scope = await seedProject("progress-failure");
    await testDb.insert(geoScans).values({
      id: "progress-scan",
      ...scope,
      plan: {
        totalChecks: 2,
        promptCount: 2,
        sequenceCount: 0,
        engines: ["openai/gpt-4o-mini"],
        languages: ["English"],
        taskStates: {},
      },
    });
    await database.postgres.exec(
      "ALTER TABLE geo_scans ADD CONSTRAINT simulate_status_write_failure CHECK (position($$failed$$ in plan::text) = 0)"
    );
    const errors = spyOn(geoLog, "error");
    errors.mockClear();
    try {
      const result = await Effect.runPromise(
        runGeoScanTaskBatch(
          {
            ...scope,
            scanId: "progress-scan",
            runId: "review",
            companyName: "Selected",
            aliases: [],
            gate: testBillingGate,
            startedAtMs: Date.now(),
          },
          ["good", "bad"].map((id) => ({
            engine: "openai/gpt-4o-mini",
            groundedKey: null,
            prompt: { id, text: id },
            language: "English",
            zdr: "none" as const,
          }))
        ).pipe(
          Effect.provideService(GeoModelService, {
            ...fakeModels,
            answer: (input) =>
              input.prompt === "bad"
                ? Effect.fail(new GeoScanError({ message: "provider refused" }))
                : fakeModels.answer(input),
          }),
          Effect.provideService(GeoFeatureFlagService, testFeatureFlags)
        )
      );
      expect(result.checks).toBe(1);
      expect(result.dropped).toBe(1);
      const rows = await testDb.select().from(geoMentionChecks);
      expect(rows).toHaveLength(1);
      expect(rows[0]?.promptId).toBe("good");
      expect(errors).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "scan task status update failed",
          scanId: "progress-scan",
          promptId: "bad",
          causeMessage: expect.stringContaining("failed"),
        })
      );
      const scan = await testDb.query.geoScans.findFirst();
      expect(
        scan?.plan?.taskStates?.[
          JSON.stringify(["bad", "openai/gpt-4o-mini", "English"])
        ]
      ).toBe("running");
    } finally {
      errors.mockRestore();
      await database.postgres.exec(
        "ALTER TABLE geo_scans DROP CONSTRAINT simulate_status_write_failure"
      );
    }
  });

  test("fake answer and judge persist the selected project and prompt", async () => {
    const scope = await seedProject("selected");
    await testDb.insert(geoScans).values({ id: "scan-test", ...scope });
    const result = await Effect.runPromise(
      runGeoScanTaskBatch(
        {
          ...scope,
          scanId: "scan-test",
          runId: "test-run",
          companyName: "Selected",
          aliases: [],
          gate: testBillingGate,
          startedAtMs: Date.now(),
        },
        [
          {
            engine: "openai/gpt-4o-mini",
            groundedKey: null,
            prompt: {
              id: "custom-selected",
              text: "Which tools should I choose?",
            },
            language: "English",
            zdr: "none",
          },
        ]
      ).pipe(
        Effect.provideService(GeoModelService, fakeModels),
        Effect.provideService(GeoFeatureFlagService, testFeatureFlags)
      )
    );
    expect(result.checks).toBe(1);
    expect(result.mentions).toBe(1);
    const [row] = await testDb.select().from(geoMentionChecks);
    expect(row?.projectId).toBe("selected");
    expect(row?.promptId).toBe("custom-selected");
    expect(row?.mentioned).toBe(true);
    expect(row?.answer).toBe("The selected brand is a good choice.");
  });

  test("typed provider refusal drops the check without a domain retry", async () => {
    const scope = await seedProject("selected");
    let attempts = 0;
    const result = await Effect.runPromise(
      runGeoScanTaskBatch(
        {
          ...scope,
          scanId: "scan-test",
          runId: "test-run",
          companyName: "Selected",
          aliases: [],
          gate: testBillingGate,
          startedAtMs: Date.now(),
        },
        [
          {
            engine: "openai/gpt-4o-mini",
            groundedKey: null,
            prompt: {
              id: "custom-selected",
              text: "Which tools should I choose?",
            },
            language: "English",
            zdr: "none",
          },
        ]
      ).pipe(
        Effect.provideService(GeoModelService, {
          ...fakeModels,
          answer: () => {
            attempts += 1;
            return Effect.fail(
              new GeoScanError({ message: "provider refused" })
            );
          },
        }),
        Effect.provideService(GeoFeatureFlagService, testFeatureFlags)
      )
    );
    expect(attempts).toBe(1);
    expect(result.dropped).toBe(1);
    expect(result.checks).toBe(0);
    expect(await testDb.select().from(geoMentionChecks)).toHaveLength(0);
  });
});
