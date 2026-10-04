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

import { GeoModelService, GeoFeatureFlagService } from "../src/deps";
import { GeoScanError } from "../src/geo/errors";
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
// Registers the module mocks the scan batches below run against.
import "./utils/infrastructure";

const { runGeoScanTaskBatch } = await import("../src/geo/scan");

beforeAll(initializeDatabase, 30_000);
afterAll(() => database.postgres.close());
beforeEach(resetDatabase);

describe("model service in real scan batches", () => {
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
