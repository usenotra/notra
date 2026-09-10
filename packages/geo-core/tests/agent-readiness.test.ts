import "./utils/infrastructure";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "bun:test";
import assert from "node:assert/strict";

import { brandSettings, geoAgentReadinessReports } from "@notra/db/schema";
import { eq } from "drizzle-orm";
import { Deferred, Effect, Result } from "effect";

import { AgentReadinessNetwork, GeoWorkflowService } from "../src/deps";
import { makeAgentReadinessNetwork } from "../src/geo/agent-readiness-live";
import { AgentReadinessApiError } from "../src/schemas/agent-readiness-errors";
import { readinessNetwork } from "./constants/geo-boundaries";
import {
  initializeDatabase,
  resetDatabase,
  database,
  seedProject,
  testDb,
} from "./utils/database";
import { seedReadiness, withReadiness } from "./utils/geo-boundaries";

const {
  loadAgentReadiness,
  startAgentReadinessScan,
  executeAgentReadinessScan,
} = await import("../src/geo/agent-readiness");

beforeAll(initializeDatabase, 30_000);
afterAll(() => database.postgres.close());
beforeEach(resetDatabase);

describe("Agent Readiness Effect boundaries", () => {
  test("stored remote report completes the owned row without another scan", async () => {
    const payload = await seedReadiness();
    const result = await Effect.runPromise(
      withReadiness(executeAgentReadinessScan(payload), {
        ...readinessNetwork,
        scan: () => Effect.die("Stored report must not start another scan"),
      })
    );
    expect(result).toEqual({ status: "completed" });
    const loaded = await Effect.runPromise(
      loadAgentReadiness({ ...payload, brandSettingsId: "brand-readiness" })
    );
    expect(loaded.report?.id).toBe(payload.reportId);
    expect(loaded.report?.score).toBe(80);
    expect(loaded.history).toHaveLength(1);
    expect(loaded.scan).toBeNull();
  });

  test("failed handoff plus failed stamping retains the original handoff", async () => {
    const scope = await seedProject("handoff-stamp");
    const cause = new Error("test rejected handoff");
    await database.postgres.exec(
      "ALTER TABLE geo_agent_readiness_reports ADD CONSTRAINT reject_handoff_failure CHECK (status <> 'failed') NOT VALID"
    );
    try {
      const result = await Effect.runPromise(
        startAgentReadinessScan({
          ...scope,
          brandSettingsId: "brand-handoff-stamp",
        }).pipe(
          Effect.provideService(GeoWorkflowService, {
            startGeoScanRun: () => Effect.die("unexpected"),
            startGeoWriterRun: () => Effect.die("unexpected"),
            startAgentReadinessRun: () => Effect.fail(cause),
          }),
          Effect.result
        )
      );
      assert.ok(Result.isFailure(result));
      assert.ok(result.failure._tag === "AgentReadinessStampError");
      expect(result.failure.cause).toHaveProperty("cause", cause);
      expect(result.failure.stampCause).toHaveProperty(
        "_tag",
        "GeoDatabaseError"
      );
    } finally {
      await database.postgres.exec(
        "ALTER TABLE geo_agent_readiness_reports DROP CONSTRAINT reject_handoff_failure"
      );
    }
  });

  test("report adapter classifies remote errors and malformed responses", async () => {
    for (const response of [
      new Response("unavailable", { status: 503 }),
      Response.json({ unexpected: true }),
    ]) {
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const network = yield* AgentReadinessNetwork;
          return yield* network.report("https://example.com");
        }).pipe(
          Effect.provide(makeAgentReadinessNetwork(async () => response)),
          Effect.result
        )
      );
      assert.ok(Result.isFailure(result));
      expect(result.failure._tag).toBe("AgentReadinessApiError");
    }
  });
  test("missing URL is an expected failure, not a defect", async () => {
    const scope = await seedProject("missing-url");
    await testDb
      .update(brandSettings)
      .set({ websiteUrl: "" })
      .where(eq(brandSettings.id, "brand-missing-url"));
    const result = await Effect.runPromise(
      loadAgentReadiness({
        ...scope,
        brandSettingsId: "brand-missing-url",
      }).pipe(Effect.result)
    );
    assert.ok(Result.isFailure(result));
    expect(result.failure._tag).toBe("AgentReadinessTargetMissingError");
  });

  test("remote failure stamps a safe failed outcome", async () => {
    const payload = await seedReadiness();
    const result = await Effect.runPromise(
      withReadiness(executeAgentReadinessScan(payload), {
        ...readinessNetwork,
        report: () =>
          Effect.fail(
            new AgentReadinessApiError({ message: "Remote scan unavailable" })
          ),
      })
    );
    expect(result).toEqual({
      status: "failed",
      reason: "Remote scan unavailable",
    });
    expect(
      (await testDb.query.geoAgentReadinessReports.findFirst())?.status
    ).toBe("failed");
  });

  test("completion cannot overwrite a replacement scan", async () => {
    const payload = await seedReadiness();
    await testDb
      .update(geoAgentReadinessReports)
      .set({ status: "failed", errorMessage: "replaced" });
    await testDb.insert(geoAgentReadinessReports).values({
      id: "replacement",
      organizationId: payload.organizationId,
      projectId: payload.projectId,
      targetUrl: payload.targetUrl,
    });
    expect(
      await Effect.runPromise(withReadiness(executeAgentReadinessScan(payload)))
    ).toEqual({
      status: "failed",
      reason: "Scan was replaced before completion.",
    });
    expect(
      (
        await testDb.query.geoAgentReadinessReports.findFirst({
          where: eq(geoAgentReadinessReports.id, "replacement"),
        })
      )?.status
    ).toBe("running");
  });

  test("repeated starts reuse the claimed report without another workflow", async () => {
    const scope = await seedProject("claim");
    let starts = 0;
    const program = startAgentReadinessScan({
      ...scope,
      brandSettingsId: "brand-claim",
    }).pipe(
      Effect.provideService(GeoWorkflowService, {
        startGeoScanRun: () => Effect.die("unexpected"),
        startGeoWriterRun: () => Effect.die("unexpected"),
        startAgentReadinessRun: () =>
          Effect.sync(() => {
            starts += 1;
            return { runId: "ready" };
          }),
      })
    );
    const results = [
      await Effect.runPromise(program),
      await Effect.runPromise(program),
    ];
    expect(starts).toBe(1);
    expect(results[0]?.reportId).toBe(results[1]?.reportId);
    expect(results.filter((result) => result.alreadyRunning)).toHaveLength(1);
  });

  test("failed handoff stamps the row and preserves its cause", async () => {
    const scope = await seedProject("handoff");
    const cause = new Error("test handoff refused");
    const program = startAgentReadinessScan({
      ...scope,
      brandSettingsId: "brand-handoff",
    }).pipe(
      Effect.provideService(GeoWorkflowService, {
        startGeoScanRun: () => Effect.die("unexpected"),
        startGeoWriterRun: () => Effect.die("unexpected"),
        startAgentReadinessRun: () => Effect.fail(cause),
      })
    );
    const result = await Effect.runPromise(program.pipe(Effect.result));
    assert.ok(Result.isFailure(result));
    assert.ok(result.failure._tag === "AgentReadinessStartError");
    expect(result.failure.cause).toBe(cause);
    expect(
      (await testDb.query.geoAgentReadinessReports.findFirst())?.status
    ).toBe("failed");
  });

  test("failure-stamp rejection retains both failures", async () => {
    const payload = await seedReadiness();
    await database.postgres.exec(
      "ALTER TABLE geo_agent_readiness_reports ADD CONSTRAINT reject_failure CHECK (status <> 'failed') NOT VALID"
    );
    const original = new AgentReadinessApiError({ message: "remote failed" });
    try {
      const result = await Effect.runPromise(
        withReadiness(executeAgentReadinessScan(payload), {
          ...readinessNetwork,
          report: () => Effect.fail(original),
        }).pipe(Effect.result)
      );
      assert.ok(Result.isFailure(result));
      expect(result.failure._tag).toBe("AgentReadinessStampError");
      expect(result.failure.cause).toBe(original);
      expect(result.failure.stampCause).toHaveProperty(
        "_tag",
        "GeoDatabaseError"
      );
    } finally {
      await database.postgres.exec(
        "ALTER TABLE geo_agent_readiness_reports DROP CONSTRAINT reject_failure"
      );
    }
  });

  test("SSE error cancels an incomplete stream and releases its reader", async () => {
    let cancelled = false;
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode('data: {"type":"error"}\n\n')
        );
      },
      cancel() {
        cancelled = true;
      },
    });
    const layer = makeAgentReadinessNetwork(async () => new Response(stream));
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const network = yield* AgentReadinessNetwork;
        return yield* network.scan("https://example.com");
      }).pipe(Effect.provide(layer), Effect.result)
    );
    assert.ok(Result.isFailure(result));
    expect(result.failure._tag).toBe("AgentReadinessApiError");
    expect(cancelled).toBe(true);
    expect(stream.locked).toBe(false);
  });

  test("interruption forwards abort to the request and cleans up SSE", async () => {
    const entered = Deferred.makeUnsafe<void>();
    const cleaned = Deferred.makeUnsafe<void>();
    const signals: AbortSignal[] = [];
    const stream = new ReadableStream<Uint8Array>({
      cancel() {
        Effect.runSync(Deferred.succeed(cleaned, undefined));
      },
    });
    const layer = makeAgentReadinessNetwork(async (_url, init) => {
      if (init.signal) {
        signals.push(init.signal);
      }
      Effect.runSync(Deferred.succeed(entered, undefined));
      return new Response(stream);
    });
    const controller = new AbortController();
    const run = Effect.runPromise(
      Effect.gen(function* () {
        const network = yield* AgentReadinessNetwork;
        return yield* network.scan("https://example.com");
      }).pipe(Effect.provide(layer)),
      { signal: controller.signal }
    );
    await Effect.runPromise(Deferred.await(entered));
    controller.abort();
    await expect(run).rejects.toBeDefined();
    expect(signals[0]?.aborted).toBe(true);
    await Effect.runPromise(Deferred.await(cleaned));
    expect(stream.locked).toBe(false);
  });
});
