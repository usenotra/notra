import "./utils/infrastructure";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "bun:test";

import type { ContentBillingReservation } from "@notra/ai/types/billing";
import { geoAdhocScans, geoMentionChecks } from "@notra/db/schema";
import { eq } from "drizzle-orm";
import { Effect } from "effect";

import {
  GEO_ADHOC_SCAN_QUEUED_STALE_MS,
  GEO_ADHOC_SCAN_RUNNING_STALE_MS,
} from "../src/constants/geo";
import {
  GeoContentBillingService,
  GeoEntitlementService,
  GeoFeatureFlagService,
  GeoModelService,
} from "../src/deps";
import type { GeoAdhocScanRequest } from "../src/geo/adhoc-scan";
import { GeoScanError } from "../src/geo/errors";
import type { FinalizeContentBillingInput } from "../src/types/content-billing";
import type { GeoModelServiceShape } from "../src/types/model";
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
  settingsFor,
  testDb,
} from "./utils/database";

const {
  createGeoAdhocScan: createGeoAdhocScanEffect,
  discardQueuedGeoAdhocScan,
  executeGeoAdhocScan,
  failStaleGeoAdhocScans,
} = await import("../src/geo/adhoc-scan");

function createGeoAdhocScan(
  request: Omit<GeoAdhocScanRequest, "idempotencyKey">
) {
  return createGeoAdhocScanEffect({
    ...request,
    idempotencyKey: crypto.randomUUID(),
  });
}

beforeAll(initializeDatabase, 30_000);
afterAll(() => database.postgres.close());
beforeEach(resetDatabase);

const ENGINE = "openai/gpt-5.4-mini";

const groundedModels: GeoModelServiceShape = {
  ...fakeModels,
  groundedAnswer: () =>
    Effect.succeed({
      text: "Adhoc is a good choice, ahead of Rival.",
      grounding: {
        queries: ["best tools"],
        sources: [
          {
            url: "https://example.com/pricing",
            title: "Pricing",
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
    }),
};

function run<A, E>(
  program: Effect.Effect<
    A,
    E,
    | GeoContentBillingService
    | GeoEntitlementService
    | GeoFeatureFlagService
    | GeoModelService
  >,
  options: {
    models?: GeoModelServiceShape;
    gate?: ContentBillingReservation;
    settled?: FinalizeContentBillingInput[];
  } = {}
) {
  return Effect.runPromise(
    program.pipe(
      Effect.provideService(GeoModelService, options.models ?? groundedModels),
      Effect.provideService(GeoFeatureFlagService, testFeatureFlags),
      Effect.provideService(GeoEntitlementService, {
        resolveZdrEntitlement: () => Effect.succeed("not_entitled" as const),
      }),
      Effect.provideService(GeoContentBillingService, {
        gateContentBilling: () =>
          Effect.succeed(options.gate ?? testBillingGate),
        finalizeContentBilling: (input) =>
          Effect.sync(() => {
            options.settled?.push(input);
          }),
      })
    )
  );
}

function loadScan(id: string) {
  return testDb.query.geoAdhocScans.findFirst({
    where: eq(geoAdhocScans.id, id),
  });
}

describe("one-off GEO scan", () => {
  test("runs the web-search variant and keeps results out of the tracked checks", async () => {
    const scope = await seedProject("adhoc");
    const settled: FinalizeContentBillingInput[] = [];
    const { id } = await run(
      createGeoAdhocScan({
        ...scope,
        prompt: " best tools ",
        engines: [ENGINE],
      })
    );
    expect((await loadScan(id))?.status).toBe("queued");

    expect(await run(executeGeoAdhocScan(id), { settled })).toBe(id);

    const scan = await loadScan(id);
    expect(scan?.status).toBe("completed");
    expect(scan?.results?.skipped).toEqual([]);
    expect(scan?.results?.checks).toHaveLength(1);
    const [check] = scan?.results?.checks ?? [];
    expect(check?.engine).toBe(`${ENGINE}-grounded`);
    expect(check?.prompt).toBe("best tools");
    expect(check?.mentioned).toBe(true);
    expect(check?.position).toBe(1);
    expect(check?.ownedSourceCited).toBe(true);
    expect(check?.grounding.queries).toEqual(["best tools"]);

    expect(await testDb.select().from(geoMentionChecks)).toHaveLength(0);
    expect((await settingsFor(scope.projectId))?.scanStartedAt).toBeNull();
    expect(settled).toHaveLength(1);
    expect(settled[0]?.action).toBe("confirm");
    expect(settled[0]?.units).toBe(1);
    expect(settled[0]?.properties?.source).toBe("geo_adhoc_scan");
  });

  test("a second runner handed the same id takes nothing", async () => {
    const scope = await seedProject("adhoc-twice");
    const { id } = await run(
      createGeoAdhocScan({ ...scope, prompt: "best tools", engines: [ENGINE] })
    );
    await run(executeGeoAdhocScan(id));
    expect(await run(executeGeoAdhocScan(id))).toBeNull();
  });

  test("reuses an idempotent scan and rejects a changed payload", async () => {
    const scope = await seedProject("adhoc-idempotent");
    const idempotencyKey = crypto.randomUUID();
    const first = await run(
      createGeoAdhocScanEffect({
        ...scope,
        idempotencyKey,
        prompt: "best tools",
        engines: [ENGINE],
      })
    );
    const repeated = await run(
      createGeoAdhocScanEffect({
        ...scope,
        idempotencyKey,
        prompt: "best tools",
        engines: [ENGINE],
      })
    );
    expect(repeated).toEqual({
      id: first.id,
      status: "queued",
      created: false,
    });

    const conflict = await run(
      createGeoAdhocScanEffect({
        ...scope,
        idempotencyKey,
        prompt: "different prompt",
        engines: [ENGINE],
      }).pipe(Effect.flip)
    );
    expect(conflict._tag).toBe("GeoAdhocScanConflictError");
  });

  test("a billing denial fails the scan before any model is called", async () => {
    const scope = await seedProject("adhoc-denied");
    const { id } = await run(
      createGeoAdhocScan({ ...scope, prompt: "best tools", engines: [ENGINE] })
    );
    await run(executeGeoAdhocScan(id), {
      models: {
        ...fakeModels,
        groundedAnswer: () => Effect.die("model called after denial"),
      },
      gate: {
        allowed: false,
        reason: "quota_exhausted",
        featureId: "ai_answers",
      } as ContentBillingReservation,
    });
    const scan = await loadScan(id);
    expect(scan?.status).toBe("failed");
    expect(scan?.errorCode).toBe("credits_exhausted");
    expect(scan?.retryable).toBe(false);
  });

  test("failed engines release the reservation and mark the scan retryable", async () => {
    const scope = await seedProject("adhoc-failed");
    const settled: FinalizeContentBillingInput[] = [];
    const { id } = await run(
      createGeoAdhocScan({ ...scope, prompt: "best tools", engines: [ENGINE] })
    );
    await run(executeGeoAdhocScan(id), {
      settled,
      models: {
        ...fakeModels,
        groundedAnswer: () =>
          Effect.fail(new GeoScanError({ message: "provider down" })),
      },
    });
    const scan = await loadScan(id);
    expect(scan?.status).toBe("failed");
    expect(scan?.errorCode).toBe("no_answers");
    expect(scan?.retryable).toBe(true);
    expect(scan?.results?.skipped).toEqual([
      { engine: `${ENGINE}-grounded`, reason: "failed" },
    ]);
    expect(settled.map((entry) => entry.action)).toEqual(["release"]);
  });

  test("rejects models outside the catalog", async () => {
    const scope = await seedProject("adhoc-invalid");
    const result = await run(
      createGeoAdhocScan({
        ...scope,
        prompt: "best tools",
        engines: ["made-up/model"],
      }).pipe(Effect.flip)
    );
    expect(result._tag).toBe("GeoAdhocScanInvalidError");
  });

  test("rejects unsupported languages", async () => {
    const scope = await seedProject("adhoc-language");
    const result = await run(
      createGeoAdhocScan({
        ...scope,
        prompt: "best tools",
        engines: [ENGINE],
        language: "Klingon",
      }).pipe(Effect.flip)
    );
    expect(result._tag).toBe("GeoAdhocScanInvalidError");
  });

  test("discards a queued scan when its runner cannot accept it", async () => {
    const scope = await seedProject("adhoc-discard");
    const { id } = await run(
      createGeoAdhocScan({ ...scope, prompt: "best tools", engines: [ENGINE] })
    );
    expect(await run(discardQueuedGeoAdhocScan(id))).toBe(true);
    expect(await loadScan(id)).toBeUndefined();
  });

  test("the stale sweep fails scans whose runner disappeared", async () => {
    const scope = await seedProject("adhoc-stale");
    const { id } = await run(
      createGeoAdhocScan({ ...scope, prompt: "best tools", engines: [ENGINE] })
    );
    const startedAt = new Date(
      Date.now() - GEO_ADHOC_SCAN_RUNNING_STALE_MS - 1000
    );
    await testDb
      .update(geoAdhocScans)
      .set({ status: "running", startedAt, heartbeatAt: startedAt })
      .where(eq(geoAdhocScans.id, id));
    expect(await run(failStaleGeoAdhocScans())).toBe(1);
    const scan = await loadScan(id);
    expect(scan?.status).toBe("failed");
    expect(scan?.errorCode).toBe("stale");
  });

  test("keeps a long-running scan with a fresh heartbeat", async () => {
    const scope = await seedProject("adhoc-heartbeat");
    const { id } = await run(
      createGeoAdhocScan({ ...scope, prompt: "best tools", engines: [ENGINE] })
    );
    const now = new Date();
    const startedAt = new Date(
      now.getTime() - GEO_ADHOC_SCAN_RUNNING_STALE_MS - 1000
    );
    await testDb
      .update(geoAdhocScans)
      .set({ status: "running", startedAt, heartbeatAt: now })
      .where(eq(geoAdhocScans.id, id));

    expect(await run(failStaleGeoAdhocScans(now))).toBe(0);
    const scan = await loadScan(id);
    expect(scan?.status).toBe("running");
    expect(scan?.startedAt).toEqual(startedAt);
  });

  test("keeps queued scans until the backlog deadline", async () => {
    const scope = await seedProject("adhoc-queued-stale");
    const { id } = await run(
      createGeoAdhocScan({ ...scope, prompt: "best tools", engines: [ENGINE] })
    );
    const now = new Date();
    await testDb
      .update(geoAdhocScans)
      .set({
        createdAt: new Date(
          now.getTime() - GEO_ADHOC_SCAN_RUNNING_STALE_MS - 1000
        ),
      })
      .where(eq(geoAdhocScans.id, id));

    expect(await run(failStaleGeoAdhocScans(now))).toBe(0);
    expect((await loadScan(id))?.status).toBe("queued");

    await testDb
      .update(geoAdhocScans)
      .set({
        createdAt: new Date(
          now.getTime() - GEO_ADHOC_SCAN_QUEUED_STALE_MS - 1000
        ),
      })
      .where(eq(geoAdhocScans.id, id));
    expect(await run(failStaleGeoAdhocScans(now))).toBe(1);
    expect((await loadScan(id))?.status).toBe("failed");
  });
});
