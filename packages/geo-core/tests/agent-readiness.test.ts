import "./utils/infrastructure";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "bun:test";

import { geoAgentReadinessReports } from "@notra/db/schema";
import { eq } from "drizzle-orm";
import { Effect } from "effect";

import { GeoWorkflowService } from "../src/deps";
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
});
