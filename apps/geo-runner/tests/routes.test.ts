import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  mock,
  test,
} from "bun:test";

import { geoAdhocScans, geoMentionChecks } from "@notra/db/schema";
import {
  GeoContentBillingService,
  GeoEntitlementService,
  GeoFeatureFlagService,
  GeoModelService,
} from "@notra/geo-core/deps";
import { Effect, Layer } from "effect";

import { seedGeoModelCatalog } from "../../../packages/geo-core/src/utils/geo-model-catalog";
import {
  fakeModels,
  testBillingGate,
  testFeatureFlags,
} from "../../../packages/geo-core/tests/constants/geo-boundaries";
import {
  database,
  initializeDatabase,
  resetDatabase,
  seedProject,
  testDb,
} from "../../../packages/geo-core/tests/utils/database";

const geoLogInfo = mock(() => undefined);
const geoLogWarn = mock(() => undefined);
const geoLogError = mock(() => undefined);

mock.module("@notra/db/drizzle", () => ({ db: testDb }));
mock.module("@notra/ai/evlog", () => ({
  log: { info: mock(), warn: mock(), error: mock() },
  geoLog: { info: geoLogInfo, warn: geoLogWarn, error: geoLogError },
  geoLogDrainEnabled: true,
  flushGeoLog: async () => undefined,
  useLogger: () => ({ getContext: () => ({}), set: mock() }),
}));
mock.module("../../../packages/geo-core/src/geo/model-catalog", () => ({
  loadGeoModelCatalog: () => Effect.succeed(seedGeoModelCatalog()),
}));

const { executeGeoAdhocScan } = await import("@notra/geo-core/geo/adhoc-scan");
const { createApp } = await import("../src/http/routes");
const { RunQueue } = await import("../src/services/run-queue");

const SECRET = "test-runner-secret-that-is-at-least-32-characters";
const ENGINE = "openai/gpt-5.4-mini";

const testGeoLayer = Layer.mergeAll(
  Layer.succeed(GeoModelService, {
    ...fakeModels,
    groundedAnswer: () =>
      Effect.succeed({
        text: "Notra is the best tool.",
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
      }),
  }),
  Layer.succeed(GeoFeatureFlagService, testFeatureFlags),
  Layer.succeed(GeoEntitlementService, {
    resolveZdrEntitlement: () => Effect.succeed("not_entitled" as const),
  }),
  Layer.succeed(GeoContentBillingService, {
    gateContentBilling: () => Effect.succeed(testBillingGate),
    finalizeContentBilling: () => Effect.void,
  })
);

function makeHandler(accept: boolean) {
  const queue = RunQueue.of({
    offer: (scanId) =>
      accept
        ? executeGeoAdhocScan(scanId).pipe(
            Effect.provide(testGeoLayer),
            Effect.orDie,
            Effect.as(true)
          )
        : Effect.succeed(false),
    drain: () => Effect.void,
  });
  const app = createApp(queue, SECRET, testGeoLayer);
  return { handler: app.fetch, dispose: async () => undefined };
}

function postScan(
  body: object,
  handler: (request: Request) => Response | Promise<Response>,
  idempotencyKey: string = crypto.randomUUID()
) {
  return Promise.resolve(
    handler(
      new Request("http://localhost/scans", {
        method: "POST",
        headers: {
          authorization: `Bearer ${SECRET}`,
          "content-type": "application/json",
          "idempotency-key": idempotencyKey,
        },
        body: JSON.stringify(body),
      })
    )
  );
}

beforeAll(initializeDatabase, 30_000);
afterAll(() => database.postgres.close());
beforeEach(async () => {
  geoLogInfo.mockClear();
  geoLogWarn.mockClear();
  geoLogError.mockClear();
  await resetDatabase();
});

describe("geo runner HTTP routes", () => {
  test("creates, runs, and returns a completed one-off scan", async () => {
    const scope = await seedProject("runner-complete");
    const app = makeHandler(true);

    const created = await postScan(
      { ...scope, prompt: "best tools", engines: [ENGINE] },
      app.handler
    );
    expect(created.status).toBe(202);
    const { id } = (await created.json()) as { id: string };

    const response = await app.handler(
      new Request(
        `http://localhost/scans/${id}?organizationId=${scope.organizationId}&projectId=${scope.projectId}`,
        { headers: { authorization: `Bearer ${SECRET}` } }
      )
    );
    expect(response.status).toBe(200);
    const scan = (await response.json()) as {
      status: string;
      results: { checks: unknown[] };
    };
    expect(scan.status).toBe("completed");
    expect(scan.results.checks).toHaveLength(1);
    expect(scan).not.toHaveProperty("idempotencyKey");
    expect(await testDb.select().from(geoMentionChecks)).toHaveLength(0);
    expect(geoLogInfo).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "geo.runner.request",
        method: "GET",
        path: `/scans/${id}`,
        status: 200,
      })
    );
    await app.dispose();
  });

  test("rejects unknown projects with 404", async () => {
    const app = makeHandler(true);
    const response = await postScan(
      {
        organizationId: "missing-org",
        projectId: "missing-project",
        prompt: "best tools",
        engines: [ENGINE],
      },
      app.handler
    );
    expect(response.status).toBe(404);
    await app.dispose();
  });

  test("removes a new scan when the queue rejects it", async () => {
    const scope = await seedProject("runner-busy");
    const app = makeHandler(false);
    const response = await postScan(
      { ...scope, prompt: "best tools", engines: [ENGINE] },
      app.handler
    );
    expect(response.status).toBe(503);
    expect(await testDb.select().from(geoAdhocScans)).toHaveLength(0);
    await app.dispose();
  });

  test("requires the runner secret", async () => {
    const app = makeHandler(true);
    const response = await app.handler(
      new Request("http://localhost/health/../scans", { method: "POST" })
    );
    expect(response.status).toBe(401);
    await app.dispose();
  });

  test("returns the models available to a project", async () => {
    const scope = await seedProject("runner-models");
    const app = makeHandler(true);
    const response = await app.handler(
      new Request(
        `http://localhost/models?organizationId=${scope.organizationId}&projectId=${scope.projectId}`,
        { headers: { authorization: `Bearer ${SECRET}` } }
      )
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      models: Array<{ id: string; supportsWebSearch: boolean }>;
    };
    expect(body.models).toContainEqual(
      expect.objectContaining({
        id: ENGINE,
        supportsWebSearch: expect.any(Boolean),
      })
    );
    expect(
      body.models.some((model) => model.id === "meta/muse-spark-1.2")
    ).toBe(false);

    const previousSerp = process.env.SERPAPI_API_KEY;
    process.env.SERPAPI_API_KEY = "test-serp-key";
    try {
      const grounded = await app.handler(
        new Request(
          `http://localhost/models?organizationId=${scope.organizationId}&projectId=${scope.projectId}`,
          { headers: { authorization: `Bearer ${SECRET}` } }
        )
      );
      const groundedBody = (await grounded.json()) as {
        models: Array<{ id: string; supportsWebSearch: boolean }>;
      };
      expect(groundedBody.models).toContainEqual(
        expect.objectContaining({
          id: "google/ai-overview",
          supportsWebSearch: true,
        })
      );
    } finally {
      if (previousSerp === undefined) {
        delete process.env.SERPAPI_API_KEY;
      } else {
        process.env.SERPAPI_API_KEY = previousSerp;
      }
    }
    await app.dispose();
  });

  test("makes POST retries idempotent", async () => {
    const scope = await seedProject("runner-idempotent");
    const app = makeHandler(true);
    const key = crypto.randomUUID();
    const body = { ...scope, prompt: "best tools", engines: [ENGINE] };
    const first = await postScan(body, app.handler, key);
    const repeated = await postScan(body, app.handler, key);
    expect(first.status).toBe(202);
    expect(repeated.status).toBe(200);
    expect(await repeated.json()).toEqual({
      id: ((await first.json()) as { id: string }).id,
      status: "completed",
    });
    expect(await testDb.select().from(geoAdhocScans)).toHaveLength(1);
    await app.dispose();
  });

  test("rejects invalid scans and idempotency conflicts", async () => {
    const scope = await seedProject("runner-invalid");
    const app = makeHandler(true);
    const key = crypto.randomUUID();
    const first = await postScan(
      { ...scope, prompt: "best tools", engines: [ENGINE] },
      app.handler,
      key
    );
    expect(first.status).toBe(202);
    const conflict = await postScan(
      { ...scope, prompt: "different", engines: [ENGINE] },
      app.handler,
      key
    );
    expect(conflict.status).toBe(409);
    const invalid = await postScan(
      { ...scope, prompt: "best tools", engines: ["made-up/model"] },
      app.handler
    );
    expect(invalid.status).toBe(422);
    const hidden = await postScan(
      { ...scope, prompt: "best tools", engines: ["meta/muse-spark-1.2"] },
      app.handler
    );
    expect(hidden.status).toBe(422);
    const missingKey = await postScan(
      { ...scope, prompt: "best tools", engines: [ENGINE] },
      app.handler,
      ""
    );
    expect(missingKey.status).toBe(422);
    await app.dispose();
  });

  test("rejects malformed and oversized request bodies", async () => {
    const app = makeHandler(true);
    const headers = {
      authorization: `Bearer ${SECRET}`,
      "content-type": "application/json",
      "idempotency-key": crypto.randomUUID(),
    };
    const malformed = await app.handler(
      new Request("http://localhost/scans", {
        method: "POST",
        headers,
        body: "{",
      })
    );
    expect(malformed.status).toBe(400);

    const oversizedBody = JSON.stringify({ prompt: "x".repeat(17 * 1024) });
    const oversized = await app.handler(
      new Request("http://localhost/scans", {
        method: "POST",
        headers: {
          ...headers,
          "content-length": String(oversizedBody.length),
        },
        body: oversizedBody,
      })
    );
    expect(oversized.status).toBe(413);
    await app.dispose();
  });

  test("accepts a lowercase bearer scheme", async () => {
    const scope = await seedProject("runner-bearer-case");
    const app = makeHandler(true);
    const response = await app.handler(
      new Request(
        `http://localhost/models?organizationId=${scope.organizationId}&projectId=${scope.projectId}`,
        { headers: { authorization: `bearer ${SECRET}` } }
      )
    );
    expect(response.status).toBe(200);
    await app.dispose();
  });

  test("rejects a run for a missing or finished scan", async () => {
    const scope = await seedProject("runner-run");
    const app = makeHandler(true);
    const missing = await app.handler(
      new Request("http://localhost/scans/missing-scan/run", {
        method: "POST",
        headers: { authorization: `Bearer ${SECRET}` },
      })
    );
    expect(missing.status).toBe(404);

    const created = await postScan(
      { ...scope, prompt: "best tools", engines: [ENGINE] },
      app.handler
    );
    const { id } = (await created.json()) as { id: string };
    const finished = await app.handler(
      new Request(`http://localhost/scans/${id}/run`, {
        method: "POST",
        headers: { authorization: `Bearer ${SECRET}` },
      })
    );
    expect(finished.status).toBe(409);
    await app.dispose();
  });

  test("reports readiness only with a secret and a runnable provider", async () => {
    const keys = [
      "AI_GATEWAY_API_KEY",
      "OPENROUTER_API_KEY",
      "VERCEL_OIDC_TOKEN",
      "VERCEL",
    ] as const;
    const previous = new Map(keys.map((key) => [key, process.env[key]]));
    const restore = () => {
      for (const key of keys) {
        const value = previous.get(key);
        if (value === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
      }
    };

    try {
      for (const key of keys) {
        delete process.env[key];
      }
      process.env.AI_GATEWAY_API_KEY = "test-gateway-key";
      const app = makeHandler(true);
      expect(
        await (await app.handler(new Request("http://localhost/ready"))).json()
      ).toEqual({ ok: true });
      await app.dispose();

      const weakApp = createApp(
        RunQueue.of({
          offer: () => Effect.succeed(true),
          drain: () => Effect.void,
        }),
        "too-short",
        testGeoLayer
      );
      expect(
        (await weakApp.fetch(new Request("http://localhost/ready"))).status
      ).toBe(503);

      delete process.env.AI_GATEWAY_API_KEY;
      const unconfigured = createApp(
        RunQueue.of({
          offer: () => Effect.succeed(true),
          drain: () => Effect.void,
        }),
        SECRET,
        testGeoLayer
      );
      expect(
        (await unconfigured.fetch(new Request("http://localhost/ready"))).status
      ).toBe(503);
    } finally {
      restore();
    }
  });
});
