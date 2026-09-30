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
import { geoMentionChecks, geoScanEvents, geoScans } from "@notra/db/schema";
import { queryGeoCheckOverview } from "@notra/db/utils/geo-checks";
import { Effect } from "effect";

import {
  GEO_OPENCODE_ENGINE_ID,
  GEO_SEQUENCE_MAX_TURNS,
} from "../src/constants/geo";
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
import {
  mockAskGeoOpenCode,
  mockAskGeoOpenCodeConversation,
} from "./utils/infrastructure";
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
      personas: [],
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
                grounding: {
                  queries: [],
                  sources: [
                    {
                      title: "Search hit",
                      url: "https://example.com/search-result",
                      domain: "example.com",
                    },
                  ],
                },
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
    expect(
      (await testDb.select().from(geoMentionChecks))[0]?.ownedSourceCited
    ).toBe(false);
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
        })
      );
      const events = await testDb.select().from(geoScanEvents);
      expect(
        events.some(
          (event) =>
            event.step === "check" &&
            event.status === "error" &&
            event.errorMessage?.includes("provider refused")
        )
      ).toBe(true);
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
    expect(row?.durationMs).toBeGreaterThanOrEqual(0);
    expect(row?.judgeTokens).toBe(0);
    expect(result.judgeUsage?.totalTokens).toBe(0);
    const events = await testDb.select().from(geoScanEvents);
    expect(events.some((event) => event.step === "task_batch")).toBe(true);
  });

  test("an owned citation adds visibility without inventing a mention", async () => {
    const scope = await seedProject("absent");
    await testDb.insert(geoScans).values({ id: "scan-test", ...scope });
    const result = await Effect.runPromise(
      runGeoScanTaskBatch(
        {
          ...scope,
          scanId: "scan-test",
          runId: "test-run",
          companyName: "Email SDK",
          aliases: ["@opencoredev/email-sdk"],
          websiteUrl: "https://example.com",
          gate: testBillingGate,
          startedAtMs: Date.now(),
        },
        [
          {
            engine: "openai/gpt-4o-mini",
            groundedKey: null,
            prompt: {
              id: "custom-absent",
              text: "Which tools should I choose?",
            },
            language: "English",
            zdr: "none",
          },
        ]
      ).pipe(
        Effect.provideService(GeoModelService, {
          ...fakeModels,
          answer: () =>
            Effect.succeed({
              text: "The selected brand is a good choice.",
              grounding: {
                queries: ["email tools"],
                sources: [
                  {
                    title: "Email guide",
                    url: "https://docs.example.com/email",
                    domain: "docs.example.com",
                  },
                ],
              },
              sources: [
                { title: "Email guide", url: "https://docs.example.com/email" },
              ],
              finishReason: "stop",
              zdrEnforced: null,
            }),
        }),
        Effect.provideService(GeoFeatureFlagService, testFeatureFlags)
      )
    );
    expect(result.checks).toBe(1);
    expect(result.mentions).toBe(0);
    const [row] = await testDb.select().from(geoMentionChecks);
    expect(row?.mentioned).toBe(false);
    expect(row?.ownedSourceCited).toBe(true);
    expect(row?.position).toBeNull();
    expect(row?.sentiment).toBeNull();
    const [overview] = await queryGeoCheckOverview(scope, undefined);
    expect(overview?.mentions).toBe(0);
    expect(overview?.citations).toBe(1);
    expect(overview?.visibility).toBe(1);
    expect(overview?.visibilityRate).toBe(1);
  });

  test("a search result alone does not count as an owned citation", async () => {
    const scope = await seedProject("search-result");
    await testDb.insert(geoScans).values({ id: "scan-test", ...scope });
    await Effect.runPromise(
      runGeoScanTaskBatch(
        {
          ...scope,
          scanId: "scan-test",
          runId: "test-run",
          companyName: "Email SDK",
          aliases: [],
          websiteUrl: "https://example.com",
          gate: testBillingGate,
          startedAtMs: Date.now(),
        },
        [
          {
            engine: "openai/gpt-4o-mini",
            groundedKey: null,
            prompt: {
              id: "custom-search",
              text: "Which tools should I choose?",
            },
            language: "English",
            zdr: "none",
          },
        ]
      ).pipe(
        Effect.provideService(GeoModelService, {
          ...fakeModels,
          answer: () =>
            Effect.succeed({
              text: "Other tools are a better fit.",
              grounding: {
                queries: ["email tools"],
                sources: [
                  {
                    title: "Email guide",
                    url: "https://docs.example.com/email",
                    domain: "docs.example.com",
                  },
                ],
              },
              sources: [],
              finishReason: "stop",
              zdrEnforced: null,
            }),
        }),
        Effect.provideService(GeoFeatureFlagService, testFeatureFlags)
      )
    );
    const [row] = await testDb.select().from(geoMentionChecks);
    expect(row?.mentioned).toBe(false);
    expect(row?.ownedSourceCited).toBe(false);
    const [overview] = await queryGeoCheckOverview(scope, undefined);
    expect(overview?.citations).toBe(0);
  });

  test("OpenCode search results do not count as citations in prompts or sequences", async () => {
    const boxKey = process.env.UPSTASH_BOX_API_KEY;
    const modelKey = process.env.OPENROUTER_API_KEY;
    process.env.UPSTASH_BOX_API_KEY = "test-box-key";
    process.env.OPENROUTER_API_KEY = "test-model-key";
    try {
      const scope = await seedProject("opencode-search");
      await testDb.insert(geoScans).values({ id: "scan-test", ...scope });
      const result = {
        text: "Other tools are a better fit.",
        sources: [],
        groundingSources: [
          { url: "https://docs.example.com/email", title: null },
        ],
        toolCalls: [],
        usage: {
          modelId: "test-model",
          totalUsd: 0,
          computeMs: 0,
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          inputTokenDetails: {
            noCacheTokens: 0,
            cacheReadTokens: 0,
            cacheWriteTokens: undefined,
          },
          outputTokenDetails: { textTokens: 0, reasoningTokens: undefined },
        },
      };
      mockAskGeoOpenCode.mockImplementationOnce(async () => result);
      mockAskGeoOpenCodeConversation.mockImplementationOnce(async () => [
        result,
      ]);
      const context = {
        ...scope,
        scanId: "scan-test",
        runId: "test-run",
        companyName: "Email SDK",
        aliases: [],
        websiteUrl: "https://example.com",
        gate: testBillingGate,
        startedAtMs: Date.now(),
      };
      await Effect.runPromise(
        runGeoScanTaskBatch(context, [
          {
            engine: GEO_OPENCODE_ENGINE_ID,
            groundedKey: null,
            prompt: { id: "custom-search", text: "Which tools?" },
            language: "English",
            zdr: "none",
          },
        ]).pipe(
          Effect.provideService(GeoModelService, fakeModels),
          Effect.provideService(GeoFeatureFlagService, testFeatureFlags)
        )
      );
      await Effect.runPromise(
        runGeoScanSequenceBatch(context, [
          {
            sequenceId: "search-sequence",
            engine: GEO_OPENCODE_ENGINE_ID,
            groundedKey: null,
            zdr: "none",
            steps: ["Which tools?"],
          },
        ]).pipe(
          Effect.provideService(GeoModelService, fakeModels),
          Effect.provideService(GeoFeatureFlagService, testFeatureFlags)
        )
      );
      const rows = await testDb.select().from(geoMentionChecks);
      expect(rows).toHaveLength(2);
      expect(rows.every((row) => !row.ownedSourceCited)).toBe(true);
      expect(
        rows.map((row) => ({
          promptId: row.promptId,
          sources: row.grounding.sources,
        }))
      ).toEqual([
        {
          promptId: "custom-search",
          sources: [
            {
              title: "docs.example.com",
              url: "https://docs.example.com/email",
              domain: "docs.example.com",
            },
          ],
        },
        {
          promptId: "sequence-search-sequence",
          sources: [
            {
              title: "docs.example.com",
              url: "https://docs.example.com/email",
              domain: "docs.example.com",
            },
          ],
        },
      ]);
    } finally {
      if (boxKey === undefined) {
        delete process.env.UPSTASH_BOX_API_KEY;
      } else {
        process.env.UPSTASH_BOX_API_KEY = boxKey;
      }
      if (modelKey === undefined) {
        delete process.env.OPENROUTER_API_KEY;
      } else {
        process.env.OPENROUTER_API_KEY = modelKey;
      }
    }
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
