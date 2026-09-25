import "./utils/infrastructure";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  mock,
  test,
} from "bun:test";
import assert from "node:assert/strict";

import { buildGeoPlannerPrompt } from "@notra/ai/prompts/geo_writer/planner";
import type { GenerateGeoContentBriefOptions } from "@notra/ai/types/geo-writer";
import {
  geoContentBriefs,
  geoMentionChecks,
  geoPrompts,
  geoPromptSuggestions,
  geoScans,
} from "@notra/db/schema";
import { eq } from "drizzle-orm";
import { Effect } from "effect";

import {
  SCAN_SUGGESTION_EVIDENCE_LIMIT,
  SCAN_SUGGESTION_LIMIT,
} from "../src/constants/scan-suggestions";
import {
  GeoContentBillingService,
  GeoGenerationService,
  GeoWorkflowService,
} from "../src/deps";
import { collectScanSuggestions } from "../src/utils/scan-suggestions";
import { EMPTY_AGENT_TOKEN_USAGE } from "../src/utils/token-usage";
import { SCAN_BRIEF, SCAN_CHECK } from "./constants/scan-suggestions";
import {
  database,
  initializeDatabase,
  resetDatabase,
  seedProject,
  testDb,
} from "./utils/database";
import { seedScanQuery } from "./utils/scan-suggestions";

const generateBrief = mock(
  async (_options: GenerateGeoContentBriefOptions) => ({
    brief: SCAN_BRIEF,
    usage: EMPTY_AGENT_TOKEN_USAGE,
  })
);
mock.module("@notra/ai/agents/geo-writer", () => ({
  generateGeoContentBrief: generateBrief,
}));
mock.module("@notra/ai/jobs/collection-title", () => ({
  maybeGenerateCollectionTitle: async () => undefined,
}));
const { refreshScanSuggestions } = await import("../src/geo/scan-suggestions");
const { acceptSuggestion, dismissSuggestion, listSuggestions } =
  await import("../src/geo/suggestions");
const { loadGeoContentGaps } = await import("../src/geo/gaps");
const { loadScanSuggestionEvidence } = await import("../src/geo/evidence");
const { planGeoContentBrief } = await import("../src/geo/writer");

beforeAll(initializeDatabase, 30_000);
afterAll(() => database.postgres.close());
beforeEach(async () => {
  await resetDatabase();
  generateBrief.mockClear();
});

describe("scan search query collection", () => {
  test("normalizes Unicode, case and whitespace; excludes echoes, brand, navigation, invalid lengths, tracked prompts and empty answers", () => {
    const checks = [
      {
        ...SCAN_CHECK,
        grounding: {
          sources: [],
          queries: [
            SCAN_CHECK.prompt.toUpperCase(),
            "  serverless   postgres tools  ",
            "ＳＥＲＶＥＲＬＥＳＳ postgres tools",
            "Which Acme tools are best?",
            "https://example.com/docs",
            "site:example.com tools",
            "login",
            "",
            "ab",
            "x".repeat(5000),
            "tracked   query",
          ],
        },
      },
      {
        ...SCAN_CHECK,
        id: "empty",
        answer: "  ",
        grounding: { sources: [], queries: ["not from a usable answer"] },
      },
    ];
    const result = collectScanSuggestions(checks, ["TRACKED QUERY"], ["acme"]);
    expect(result.map((item) => item.prompt)).toEqual([
      "serverless postgres tools",
    ]);
    expect(result[0]?.evidence).toHaveLength(1);
    expect(result[0]?.evidence[0]?.query).toBe(
      "  serverless   postgres tools  "
    );
  });

  test("ranks independent origins above repeated scans and bounds evidence and suggestions", () => {
    const repeated = Array.from({ length: 20 }, (_, index) => ({
      ...SCAN_CHECK,
      id: `repeat-${index}`,
      scanId: `scan-${index}`,
    }));
    const diverse = ["one", "two"].map((id) => ({
      ...SCAN_CHECK,
      id,
      prompt: `Different origin ${id}`,
      engine: id,
      grounding: { sources: [], queries: ["diverse engine research query"] },
    }));
    const extras = Array.from({ length: 80 }, (_, index) => ({
      ...SCAN_CHECK,
      id: `extra-${index}`,
      grounding: { sources: [], queries: [`extra research query ${index}`] },
    }));
    const result = collectScanSuggestions(
      [...repeated, ...diverse, ...extras],
      [],
      []
    );
    expect(result[0]?.prompt).toBe("diverse engine research query");
    expect(result).toHaveLength(SCAN_SUGGESTION_LIMIT);
    const onlyRepeated = collectScanSuggestions(repeated, [], []);
    expect(onlyRepeated[0]?.origins.size).toBe(1);
    expect(onlyRepeated[0]?.evidence).toHaveLength(
      SCAN_SUGGESTION_EVIDENCE_LIMIT
    );
  });
});

describe("persisted scan Search Gaps", () => {
  test("includes conversation turns, excludes failed/old/foreign checks and AI Overview echoes", async () => {
    const scope = await seedProject("selected");
    const foreign = await seedProject("foreign", { organizationId: "other" });
    await seedScanQuery(scope, { turn: 1 });
    await seedScanQuery(foreign, {
      id: "foreign",
      scanId: "foreign",
      grounding: { queries: ["foreign research query"], sources: [] },
    });
    await seedScanQuery(
      scope,
      {
        id: "failed",
        scanId: "failed",
        grounding: { queries: ["failed research query"], sources: [] },
      },
      "failed"
    );
    await seedScanQuery(
      scope,
      {
        id: "running",
        scanId: "running",
        grounding: { queries: ["running research query"], sources: [] },
      },
      "running"
    );
    await seedScanQuery(scope, {
      id: "old",
      scanId: "old",
      capturedAt: new Date("2020-01-01"),
      grounding: { queries: ["old research query"], sources: [] },
    });
    await seedScanQuery(scope, {
      id: "echo",
      scanId: "echo",
      engine: "google/ai-overview",
      grounding: { queries: [SCAN_CHECK.prompt], sources: [] },
    });
    expect(await Effect.runPromise(refreshScanSuggestions(scope))).toEqual({
      inserted: 1,
    });
    const { suggestions } = await Effect.runPromise(listSuggestions(scope));
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]).toMatchObject({
      source: "scan",
      keywords: [],
      scanEvidence: [
        { checkId: "check", scanId: "scan", prompt: SCAN_CHECK.prompt },
      ],
    });
    await expect(
      Effect.runPromise(
        refreshScanSuggestions({ ...scope, projectId: "foreign" })
      )
    ).rejects.toThrow();
  });

  test("retries/concurrent refreshes keep IDs, dismissed and accepted decisions; GSC rows coexist", async () => {
    const scope = await seedProject("selected");
    await seedScanQuery(scope, {
      grounding: {
        queries: [
          "first research query",
          "second research query",
          "gsc existing query",
          "tracked existing query",
        ],
        sources: [],
      },
    });
    await testDb.insert(geoPrompts).values({
      id: "tracked",
      ...scope,
      prompt: " TRACKED   EXISTING QUERY ",
    });
    await testDb.insert(geoPromptSuggestions).values({
      id: "gsc",
      ...scope,
      prompt: "GSC existing query",
      source: "search_console",
    });
    await Promise.all([
      Effect.runPromise(refreshScanSuggestions(scope)),
      Effect.runPromise(refreshScanSuggestions(scope)),
    ]);
    const rows = await testDb.select().from(geoPromptSuggestions);
    expect(rows).toHaveLength(3);
    const first = rows.find((row) => row.prompt === "first research query");
    const second = rows.find((row) => row.prompt === "second research query");
    assert.ok(first && second);
    await Effect.runPromise(refreshScanSuggestions(scope));
    expect(
      (await testDb.select().from(geoPromptSuggestions))
        .map((row) => row.id)
        .sort()
    ).toEqual(rows.map((row) => row.id).sort());
    await Effect.runPromise(
      dismissSuggestion({ ...scope, suggestionId: first.id })
    );
    const accepted = await Effect.runPromise(
      acceptSuggestion({ ...scope, suggestionId: second.id })
    );
    expect(accepted.prompt.prompt).toBe(second.prompt);
    await Effect.runPromise(refreshScanSuggestions(scope));
    expect(
      await testDb.query.geoPromptSuggestions.findFirst({
        where: eq(geoPromptSuggestions.id, first.id),
      })
    ).toMatchObject({ status: "dismissed" });
    expect(
      await testDb.query.geoPromptSuggestions.findFirst({
        where: eq(geoPromptSuggestions.id, second.id),
      })
    ).toMatchObject({
      status: "accepted",
      acceptedPromptId: accepted.prompt.id,
    });
    expect(
      (await Effect.runPromise(listSuggestions(scope))).suggestions.map(
        (row) => row.id
      )
    ).toEqual(["gsc"]);
  });

  test("a persisted query yields null metrics, provenance, a source-aware writer draft and stable brief reuse", async () => {
    const scope = await seedProject("selected");
    await seedScanQuery(scope, {
      turn: 1,
      excerpt: "Real source-check evidence",
    });
    await Effect.runPromise(refreshScanSuggestions(scope));
    const gap = (await Effect.runPromise(loadGeoContentGaps(scope)))
      .searchGaps[0];
    assert.ok(gap);
    expect(gap).toMatchObject({
      source: "scan",
      impressions: null,
      clicks: null,
      position: null,
      queries: [],
      brief: null,
    });
    expect(gap.scanEvidence[0]?.checkId).toBe("check");
    const input = {
      ...scope,
      topic: "caller topic must be replaced",
      sourceKind: "scan" as const,
      sourceId: gap.id,
      autoApprove: false,
    };
    const plan = () =>
      Effect.runPromise(
        planGeoContentBrief(input, undefined).pipe(
          Effect.provideService(GeoContentBillingService, {
            gateContentBilling: () =>
              Effect.succeed({
                allowed: true,
                mode: "unmetered",
                featureId: null,
                reserved: false,
                lockId: null,
                useMarkup: false,
              }),
            finalizeContentBilling: () => Effect.void,
          }),
          Effect.provideService(GeoGenerationService, {
            addActiveGeneration: () => Effect.die("Unexpected generation"),
            generateRunId: () => Effect.die("Unexpected generation"),
          }),
          Effect.provideService(GeoWorkflowService, {
            startGeoScanRun: () => Effect.die("Unexpected scan"),
            startGeoWriterRun: () => Effect.die("Unexpected writer"),
            startAgentReadinessRun: () => Effect.die("Unexpected readiness"),
          })
        )
      );
    const brief = await plan();
    expect(brief.postId).toBeTruthy();
    const options = generateBrief.mock.calls[0]?.[0];
    expect(options?.input.topic).toBe(gap.prompt);
    assert.ok(options);
    const plannerPrompt = buildGeoPlannerPrompt(options.input);
    expect(plannerPrompt).toContain("<origin-evidence>");
    expect(plannerPrompt).not.toContain("<target-evidence>");
    expect(plannerPrompt).not.toContain("Baseline: brand mentioned");
    expect(options?.input.evidence?.prompt).toContain(SCAN_CHECK.prompt);
    expect(options?.input.evidence?.engines[0]?.excerpt).toBe(
      "Real source-check evidence"
    );
    expect(options?.input.evidence?.engines[0]?.sourceDomains).toEqual([
      "example.org",
    ]);
    const stored = await testDb.query.geoContentBriefs.findFirst();
    expect(stored).toMatchObject({
      sourceKind: "scan",
      sourceId: gap.id,
      topic: gap.prompt,
    });
    expect(stored?.brief.baseline).toBeNull();
    await Effect.runPromise(refreshScanSuggestions(scope));
    expect((await plan()).briefId).toBe(brief.briefId);
    expect(generateBrief).toHaveBeenCalledTimes(1);
    const after = (await Effect.runPromise(loadGeoContentGaps(scope)))
      .searchGaps[0];
    expect(after?.id).toBe(gap.id);
    expect(after?.brief?.briefId).toBe(brief.briefId);
    // Retention removes checks, but the UI and planner still have the true snapshots.
    await testDb.delete(geoMentionChecks);
    const evidence = await Effect.runPromise(
      loadScanSuggestionEvidence(scope.organizationId, scope.projectId, gap.id)
    );
    expect(evidence?.prompt).toContain(SCAN_CHECK.prompt);
    expect(evidence?.engines).toEqual([]);
    expect(buildGeoPlannerPrompt({ ...options.input, evidence })).toContain(
      SCAN_CHECK.prompt
    );
    expect(
      await Effect.runPromise(
        loadScanSuggestionEvidence("other", scope.projectId, gap.id)
      )
    ).toBeNull();
    await testDb.delete(geoScans);
  });
});
