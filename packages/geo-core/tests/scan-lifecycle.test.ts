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

import { brandSettings, geoScans } from "@notra/db/schema";
import { eq } from "drizzle-orm";
import { Effect, Exit } from "effect";

import {
  GEO_SCAN_CLAIM_RENEW_AFTER_MS,
  GEO_SCAN_DUE_LIMIT_PER_SWEEP,
  GEO_SCAN_STALE_MS,
} from "../src/constants/geo";
import { GeoWorkflowService } from "../src/deps";
import { buildGeoPrompts } from "../src/geo/prompts";
import type { GeoWorkflowServiceShape } from "../src/types/deps";
import {
  initializeDatabase,
  database,
  resetDatabase,
  seedProject,
  settingsFor,
  testDb,
} from "./utils/database";
import { cleanupBoxes } from "./utils/infrastructure";

const { runGeoScanCronSweep } = await import("../src/geo/scan-schedule");
const { loadGeoProjectBrand } = await import("../src/geo/project-brand");
const { startClaimedGeoScanRun } = await import("../src/geo/scan-handoff");
const {
  claimGeoScanRun,
  createGeoScanRow,
  failPendingGeoScanRow,
  finishGeoScanRow,
  markGeoScanFinished,
  releaseGeoScanRun,
  renewGeoScanClaimIfDue,
  renewGeoScanRun,
  sweepStaleGeoScanRows,
  withGeoScanRun,
} = await import("../src/geo/scan-status");

const startWorkflow = mock<GeoWorkflowServiceShape["startGeoScanRun"]>(() =>
  Effect.succeed({ runId: "workflow-test" })
);
const workflows: GeoWorkflowServiceShape = {
  startGeoScanRun: startWorkflow,
  startGeoWriterRun: () => Effect.die("Unexpected writer workflow"),
  startAgentReadinessRun: () => Effect.die("Unexpected readiness workflow"),
};
const sweep = () =>
  Effect.runPromise(
    runGeoScanCronSweep().pipe(
      Effect.provideService(GeoWorkflowService, workflows)
    )
  );

beforeAll(initializeDatabase, 30_000);
afterAll(() => database.postgres.close());
beforeEach(async () => {
  await resetDatabase();
  startWorkflow.mockReset();
  startWorkflow.mockImplementation(() =>
    Effect.succeed({ runId: "workflow-test" })
  );
  cleanupBoxes.mockReset();
  cleanupBoxes.mockImplementation(async () => undefined);
});

describe("scan project brand context", () => {
  test("generates prompts from the selected project's brand, not the default brand", async () => {
    const emailScope = await seedProject("email-sdk");
    const botScope = await seedProject("akeru-bot");
    await testDb
      .update(brandSettings)
      .set({
        isDefault: true,
        companyDescription: "sending transactional emails",
        audience: "email developers",
      })
      .where(eq(brandSettings.id, "brand-email-sdk"));
    await testDb
      .update(brandSettings)
      .set({
        companyDescription: "moderating Discord communities",
        audience: "community moderators",
      })
      .where(eq(brandSettings.id, "brand-akeru-bot"));

    const emailBrand = await Effect.runPromise(loadGeoProjectBrand(emailScope));
    const botBrand = await Effect.runPromise(loadGeoProjectBrand(botScope));
    expect(emailBrand?.companyDescription).toBe("sending transactional emails");
    expect(botBrand).toEqual({
      companyDescription: "moderating Discord communities",
      audience: "community moderators",
    });
    const prompts = buildGeoPrompts(
      { companyName: "Akeru Bot", aliases: [] },
      botBrand
    );
    expect(prompts.length).toBeGreaterThan(0);
    for (const prompt of prompts) {
      expect(prompt.text).toContain("discord");
      expect(prompt.text).not.toContain("email");
    }
    expect(
      prompts.find((prompt) => prompt.id === "audience-specific")?.text
    ).toContain("community moderators");
  });

  test("never falls back to another brand for missing context or a foreign project", async () => {
    const scope = await seedProject("selected");
    await seedProject("default");
    await testDb
      .update(brandSettings)
      .set({
        isDefault: true,
        companyDescription: "sending transactional emails",
      })
      .where(eq(brandSettings.id, "brand-default"));
    expect(await Effect.runPromise(loadGeoProjectBrand(scope))).toEqual({
      companyDescription: null,
      audience: null,
    });
    expect(
      await Effect.runPromise(
        loadGeoProjectBrand({
          organizationId: "other-org",
          projectId: scope.projectId,
        })
      )
    ).toBeNull();
    expect(
      await Effect.runPromise(
        loadGeoProjectBrand({
          organizationId: scope.organizationId,
          projectId: "missing",
        })
      )
    ).toBeNull();
  });
});

describe("scheduled GEO scans", () => {
  test("starts due and migrated schedules, persists pollable rows, and leaves disabled/future schedules alone", async () => {
    const future = new Date(Date.now() + 86_400_000);
    await seedProject("due", {
      nextScanAt: new Date(0),
      scanIntervalHours: 48,
    });
    await seedProject("migrated", {
      nextScanAt: null,
      organizationId: "other-org",
    });
    await seedProject("disabled", { enabled: false });
    await seedProject("future", { nextScanAt: future });
    const before = Date.now();

    expect(await sweep()).toEqual({
      due: 2,
      started: 2,
      skipped: 0,
      staleScansFailed: 0,
    });
    expect(startWorkflow).toHaveBeenCalledTimes(2);
    const scans = await testDb.select().from(geoScans);
    expect(scans).toHaveLength(2);
    for (const [payload] of startWorkflow.mock.calls) {
      const scan = scans.find((row) => row.id === payload.scanId);
      expect(scan).toMatchObject({
        organizationId: payload.organizationId,
        projectId: payload.projectId,
        status: "running",
      });
      assert.ok(payload.projectId);
      const settings = await settingsFor(payload.projectId);
      expect(settings?.scanStartedAt?.toISOString()).toBe(payload.claimedAt);
    }
    const due = await settingsFor("due");
    expect(due?.nextScanAt?.getTime()).toBeGreaterThanOrEqual(
      before + 48 * 3_600_000
    );
    expect(due?.nextScanAt?.getTime()).toBeLessThanOrEqual(
      Date.now() + 48 * 3_600_000
    );
    expect((await settingsFor("disabled"))?.scanStartedAt).toBeNull();
    expect((await settingsFor("future"))?.nextScanAt).toEqual(future);
    expect(await sweep()).toEqual({
      due: 0,
      started: 0,
      skipped: 0,
      staleScansFailed: 0,
    });
  });

  test("overlapping sweeps start a project only once", async () => {
    await seedProject("overlap");
    const results = await Promise.all([sweep(), sweep(), sweep()]);
    expect(results.reduce((sum, result) => sum + result.started, 0)).toBe(1);
    expect(startWorkflow).toHaveBeenCalledTimes(1);
    expect(await testDb.select().from(geoScans)).toHaveLength(1);
  });

  test("a manual scan holds its slot while cron advances the next tick", async () => {
    const held = new Date();
    await seedProject("busy", { scanStartedAt: held });
    expect(await sweep()).toEqual({
      due: 1,
      started: 0,
      skipped: 1,
      staleScansFailed: 0,
    });
    expect(startWorkflow).not.toHaveBeenCalled();
    const settings = await settingsFor("busy");
    expect(settings?.scanStartedAt).toEqual(held);
    expect(settings?.nextScanAt?.getTime()).toBeGreaterThan(held.getTime());
  });

  test("a refused hand-off fails its row, releases its slot and does not block another project or hot-loop", async () => {
    await seedProject("refused", { nextScanAt: new Date(0) });
    await seedProject("healthy", { nextScanAt: new Date(1) });
    startWorkflow.mockImplementationOnce(() =>
      Effect.fail(
        Object.assign(new Error("503"), { name: "InternalDashboardError" })
      )
    );
    expect(await sweep()).toEqual({
      due: 2,
      started: 1,
      skipped: 1,
      staleScansFailed: 0,
    });
    expect((await settingsFor("refused"))?.scanStartedAt).toBeNull();
    expect((await settingsFor("refused"))?.lastScanAt).toBeNull();
    const rows = await testDb
      .select()
      .from(geoScans)
      .where(eq(geoScans.projectId, "refused"));
    expect(rows[0]?.status).toBe("failed");
    expect(rows[0]?.finishedAt).toBeInstanceOf(Date);
    expect((await sweep()).due).toBe(0);
  });

  test("an ambiguous timeout holds the claim and running row to prevent duplicate billing", async () => {
    await seedProject("timeout");
    startWorkflow.mockImplementationOnce(() =>
      Effect.fail(new Error("Request timed out"))
    );
    expect((await sweep()).skipped).toBe(1);
    expect((await settingsFor("timeout"))?.scanStartedAt).toBeInstanceOf(Date);
    expect((await testDb.select().from(geoScans))[0]?.status).toBe("running");
    expect(await Effect.runPromise(claimGeoScanRun("timeout"))).toBeNull();
  });

  test("cleans up dead scans before replacing their stale claim", async () => {
    const old = new Date(Date.now() - GEO_SCAN_STALE_MS - 60_000);
    await seedProject("dead", { scanStartedAt: old });
    await testDb.insert(geoScans).values({
      id: "dead-scan",
      organizationId: "org-test",
      projectId: "dead",
      startedAt: old,
    });
    expect(await sweep()).toEqual({
      due: 1,
      started: 1,
      skipped: 0,
      staleScansFailed: 1,
    });
    expect(
      (
        await testDb.query.geoScans.findFirst({
          where: eq(geoScans.id, "dead-scan"),
        })
      )?.status
    ).toBe("failed");
  });

  test("processes at most the sweep cap, oldest first, then catches up on the next tick", async () => {
    for (let index = 0; index < GEO_SCAN_DUE_LIMIT_PER_SWEEP + 2; index++) {
      await seedProject(`project-${index}`, { nextScanAt: new Date(index) });
    }
    expect((await sweep()).started).toBe(GEO_SCAN_DUE_LIMIT_PER_SWEEP);
    expect(
      startWorkflow.mock.calls.map(([payload]) => payload.projectId)
    ).toEqual(
      Array.from(
        { length: GEO_SCAN_DUE_LIMIT_PER_SWEEP },
        (_, index) => `project-${index}`
      )
    );
    expect((await sweep()).started).toBe(2);
  });

  test("box cleanup failure does not stop scheduled scans", async () => {
    await seedProject("cleanup-failure");
    cleanupBoxes.mockRejectedValueOnce(new Error("Box service unavailable"));
    expect((await sweep()).started).toBe(1);
  });
});

describe("scan ownership and finalization", () => {
  test("only one claimant and one duplicate delivery can acquire or renew a token", async () => {
    await seedProject("claim");
    const claims = await Promise.all(
      Array.from({ length: 8 }, () =>
        Effect.runPromise(claimGeoScanRun("claim"))
      )
    );
    const winners = claims.filter((claim) => claim !== null);
    expect(winners).toHaveLength(1);
    assert.ok(winners[0]);
    const token = winners[0].claimedAt;
    const renewed = await Promise.all(
      Array.from({ length: 8 }, () =>
        Effect.runPromise(renewGeoScanRun("claim", token))
      )
    );
    expect(renewed.filter(Boolean)).toHaveLength(1);
    expect(
      (await settingsFor("claim"))?.scanStartedAt?.getTime()
    ).toBeGreaterThan(token.getTime());
  });

  test("wave renewal hands a young token back untouched and rotates an aged one", async () => {
    await seedProject("wave");
    const claim = await Effect.runPromise(claimGeoScanRun("wave"));
    assert.ok(claim);
    const young = claim.claimedAt.toISOString();
    expect(
      await Effect.runPromise(
        renewGeoScanClaimIfDue(
          "wave",
          young,
          new Date(claim.claimedAt.getTime() + 1).toISOString()
        )
      )
    ).toBe(young);
    const aged = new Date(Date.now() - GEO_SCAN_CLAIM_RENEW_AFTER_MS - 1_000);
    const renewalToken = new Date().toISOString();
    await seedProject("aged", { scanStartedAt: aged });
    const rotated = await Effect.runPromise(
      renewGeoScanClaimIfDue("aged", aged.toISOString(), renewalToken)
    );
    expect(rotated).toBe(renewalToken);
    expect((await settingsFor("aged"))?.scanStartedAt?.toISOString()).toBe(
      rotated
    );
    expect(
      await Effect.runPromise(
        renewGeoScanClaimIfDue("aged", aged.toISOString(), renewalToken)
      )
    ).toBe(renewalToken);
    const lost = await Effect.runPromiseExit(
      renewGeoScanClaimIfDue(
        "aged",
        aged.toISOString(),
        new Date(Date.now() + 1).toISOString()
      )
    );
    expect(Exit.isFailure(lost)).toBe(true);
  });

  test("an old worker cannot release, renew or finish a replacement's claim", async () => {
    const old = new Date(Date.now() - GEO_SCAN_STALE_MS - 60_000);
    await seedProject("reclaimed", { scanStartedAt: old });
    const fresh = await Effect.runPromise(claimGeoScanRun("reclaimed"));
    expect(fresh).not.toBeNull();
    await Effect.runPromise(releaseGeoScanRun("reclaimed", old));
    await Effect.runPromise(markGeoScanFinished("reclaimed", old));
    expect(
      await Effect.runPromise(renewGeoScanRun("reclaimed", old))
    ).toBeNull();
    expect((await settingsFor("reclaimed"))?.scanStartedAt).toEqual(
      fresh?.claimedAt
    );
    expect((await settingsFor("reclaimed"))?.lastScanAt).toBeNull();
    expect(await Effect.runPromise(claimGeoScanRun("reclaimed"))).toBeNull();
  });

  test.each(["completed", "failed"] as const)(
    "a %s run adopts its pending row and frees its owned slot",
    async (status) => {
      const scope = await seedProject("run");
      const claim = await Effect.runPromise(claimGeoScanRun("run"));
      assert.ok(claim);
      const scanId = await Effect.runPromise(createGeoScanRow(scope));
      const exit = await Effect.runPromiseExit(
        withGeoScanRun(
          scope,
          (id) => {
            expect(id).toBe(scanId);
            return status === "completed"
              ? Effect.succeed("answer")
              : Effect.fail(new Error("Engine unavailable"));
          },
          { scanId, claimedAt: claim.claimedAt }
        )
      );
      expect(Exit.isSuccess(exit)).toBe(status === "completed");
      const scans = await testDb.select().from(geoScans);
      expect(scans).toHaveLength(1);
      expect(scans[0]).toMatchObject({ id: scanId, status });
      expect(scans[0]?.finishedAt).toBeInstanceOf(Date);
      expect((await settingsFor("run"))?.scanStartedAt).toBeNull();
      expect((await settingsFor("run"))?.lastScanAt).toBeInstanceOf(Date);
    }
  );

  test("cannot adopt another organization's scan or overwrite a terminal verdict", async () => {
    const owner = await seedProject("owner");
    const other = await seedProject("other", { organizationId: "other-org" });
    const scanId = await Effect.runPromise(createGeoScanRow(owner));
    expect(
      Exit.isFailure(
        await Effect.runPromiseExit(createGeoScanRow(other, scanId))
      )
    ).toBeTrue();
    await Effect.runPromise(failPendingGeoScanRow(other, scanId));
    expect((await testDb.select().from(geoScans))[0]?.status).toBe("running");
    await Effect.runPromise(finishGeoScanRow(owner, scanId, "completed"));
    await Effect.runPromise(failPendingGeoScanRow(owner, scanId));
    await Effect.runPromise(finishGeoScanRow(owner, scanId, "failed"));
    expect((await testDb.select().from(geoScans))[0]?.status).toBe("completed");
    expect(
      Exit.isFailure(
        await Effect.runPromiseExit(createGeoScanRow(owner, scanId))
      )
    ).toBeTrue();
  });

  test("sweeper preserves long-running scans with a fresh lease and already completed scans", async () => {
    const old = new Date(Date.now() - GEO_SCAN_STALE_MS - 60_000);
    await seedProject("alive", { scanStartedAt: new Date() });
    await seedProject("dead", { scanStartedAt: old });
    await seedProject("released");
    for (const projectId of ["alive", "dead", "released"]) {
      await testDb.insert(geoScans).values({
        id: projectId,
        organizationId: "org-test",
        projectId,
        startedAt: old,
      });
    }
    await testDb.insert(geoScans).values({
      id: "done",
      organizationId: "org-test",
      projectId: "dead",
      startedAt: old,
      status: "completed",
    });
    expect(await Effect.runPromise(sweepStaleGeoScanRows())).toBe(2);
    const rows = await testDb.select().from(geoScans);
    expect(rows.find((row) => row.id === "alive")?.status).toBe("running");
    expect(rows.find((row) => row.id === "done")?.status).toBe("completed");
    expect(rows.find((row) => row.id === "dead")?.status).toBe("failed");
    expect(rows.find((row) => row.id === "released")?.status).toBe("failed");
  });

  test("insert failure releases the claim without starting a workflow", async () => {
    await seedProject("insert-failure");
    const claim = await Effect.runPromise(claimGeoScanRun("insert-failure"));
    assert.ok(claim);
    const result = await Effect.runPromiseExit(
      startClaimedGeoScanRun(
        "missing-org",
        "insert-failure",
        claim.claimedAt
      ).pipe(Effect.provideService(GeoWorkflowService, workflows))
    );
    expect(Exit.isFailure(result)).toBeTrue();
    expect(startWorkflow).not.toHaveBeenCalled();
    expect((await settingsFor("insert-failure"))?.scanStartedAt).toBeNull();
    expect(await testDb.select().from(geoScans)).toHaveLength(0);
  });
});
