import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  mock,
  setSystemTime,
  test,
} from "bun:test";
import assert from "node:assert/strict";

import { brandSettings, geoScans, geoSettings } from "@notra/db/schema";
import { eq } from "drizzle-orm";
import { Effect, Exit } from "effect";

import {
  GEO_SCAN_CLAIM_RENEW_AFTER_MS,
  GEO_SCAN_DUE_LIMIT_PER_SWEEP,
  GEO_SCAN_START_LEASE_MS,
  GEO_SCAN_STALE_MS,
} from "../src/constants/geo";
import { GeoContentBillingService, GeoWorkflowService } from "../src/deps";
import { buildGeoPrompts } from "../src/geo/prompts";
import type { GeoWorkflowServiceShape } from "../src/types/deps";
import { EMPTY_AGENT_TOKEN_USAGE } from "../src/utils/token-usage";
import {
  initializeDatabase,
  database,
  resetDatabase,
  seedProject,
  settingsFor,
  testDb,
} from "./utils/database";
import { cleanupBoxes } from "./utils/infrastructure";

const { nextGeoScanAtAfter, rearmedGeoScanAt, runGeoScanCronSweep } =
  await import("../src/geo/scan-schedule");
const { loadGeoProjectBrand } = await import("../src/geo/project-brand");
const { startClaimedGeoScanRun } = await import("../src/geo/scan-handoff");
const { finalizeGeoScanProject } = await import("../src/geo/scan");
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

const DAY_MS = 24 * 3_600_000;

/** A whole-minute stamp in the past, the shape the scheduler persists. */
const wholeMinutesAgo = (minutes: number) =>
  new Date(Math.floor(Date.now() / 60_000) * 60_000 - minutes * 60_000);

/** Ages the sweep's lease so the next sweep sees the row due again. */
const expireGeoScanLease = (projectId: string) =>
  testDb
    .update(geoSettings)
    .set({ scanLeaseUntil: new Date(Date.now() - 1_000) })
    .where(eq(geoSettings.projectId, projectId));

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
      covered: 0,
      leaseLost: 0,
      alreadyRunning: 0,
      failed: 0,
      advanceLost: 0,
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
    // Anchored on the previous stamp: a multiple of the interval from epoch,
    // at least one stale window ahead, at most one interval past that.
    assert.ok(due?.nextScanAt);
    expect(due.nextScanAt.getTime() % (48 * 3_600_000)).toBe(0);
    expect(due.nextScanAt.getTime()).toBeGreaterThan(
      before + GEO_SCAN_STALE_MS
    );
    expect(due.nextScanAt.getTime()).toBeLessThanOrEqual(
      Date.now() + GEO_SCAN_STALE_MS + 48 * 3_600_000
    );
    // Migrated rows are armed one interval out, on a whole minute.
    const migrated = await settingsFor("migrated");
    assert.ok(migrated?.nextScanAt);
    expect(migrated.nextScanAt.getTime() % 60_000).toBe(0);
    expect(migrated.nextScanAt.getTime()).toBeGreaterThan(
      before + 24 * 3_600_000 - 60_000
    );
    expect(migrated.nextScanAt.getTime()).toBeLessThanOrEqual(
      Date.now() + 24 * 3_600_000
    );
    expect((await settingsFor("disabled"))?.scanStartedAt).toBeNull();
    expect((await settingsFor("future"))?.nextScanAt).toEqual(future);
    expect(await sweep()).toEqual({
      due: 0,
      started: 0,
      covered: 0,
      leaseLost: 0,
      alreadyRunning: 0,
      failed: 0,
      advanceLost: 0,
      staleScansFailed: 0,
    });
  });

  test("a daily schedule keeps its time of day across late ticks", async () => {
    const day = 24 * 3_600_000;
    // Due 09:40 yesterday; the sweep only got to it 50 s late today (the
    // tick that would have caught it yesterday missed by milliseconds).
    const dueAt = new Date(Date.UTC(2026, 8, 5, 9, 40));
    const tick = new Date(dueAt.getTime() + day + 50_000);
    expect(nextGeoScanAtAfter(24, dueAt, tick)).toEqual(
      new Date(dueAt.getTime() + 2 * day)
    );
    // Ten days of missed ticks catch up to the same 09:40 slot tomorrow.
    const lateTick = new Date(dueAt.getTime() + 10 * day + 5 * 3_600_000);
    expect(nextGeoScanAtAfter(24, dueAt, lateTick)).toEqual(
      new Date(dueAt.getTime() + 11 * day)
    );
    // A slot inside the stale window of the catch-up scan is skipped.
    const justBeforeSlot = new Date(dueAt.getTime() + 3 * day - 60_000);
    expect(nextGeoScanAtAfter(24, dueAt, justBeforeSlot)).toEqual(
      new Date(dueAt.getTime() + 4 * day)
    );
    // The sweep persists exactly that stamp.
    await seedProject("cadence", { nextScanAt: new Date(0) });
    const before = Date.now();
    await sweep();
    const settings = await settingsFor("cadence");
    expect(settings?.nextScanAt).toEqual(
      nextGeoScanAtAfter(24, new Date(0), new Date(before))
    );
  });

  test("re-arming from settings follows the last scan instead of now", () => {
    const now = new Date(Date.UTC(2026, 8, 6, 12, 0));
    expect(rearmedGeoScanAt(24, null, now)).toEqual(now);
    const recent = new Date(now.getTime() - 10 * 3_600_000);
    expect(rearmedGeoScanAt(24, recent, now)).toEqual(
      new Date(recent.getTime() + 24 * 3_600_000)
    );
    const overdue = new Date(now.getTime() - 30 * 3_600_000);
    expect(rearmedGeoScanAt(24, overdue, now)).toEqual(now);
    expect(rearmedGeoScanAt(48, overdue, now)).toEqual(
      new Date(overdue.getTime() + 48 * 3_600_000)
    );
  });

  test("overlapping sweeps start a project only once", async () => {
    await seedProject("overlap");
    const results = await Promise.all([sweep(), sweep(), sweep()]);
    expect(results.reduce((sum, result) => sum + result.started, 0)).toBe(1);
    expect(startWorkflow).toHaveBeenCalledTimes(1);
    expect(await testDb.select().from(geoScans)).toHaveLength(1);
  });

  test("a manual scan holds its slot and cron only leases the tick", async () => {
    const held = new Date();
    const anchor = wholeMinutesAgo(60);
    await seedProject("busy", { scanStartedAt: held, nextScanAt: anchor });
    const before = Date.now();
    expect(await sweep()).toEqual({
      due: 1,
      started: 0,
      covered: 0,
      leaseLost: 0,
      alreadyRunning: 1,
      failed: 0,
      advanceLost: 0,
      staleScansFailed: 0,
    });
    expect(startWorkflow).not.toHaveBeenCalled();
    const settings = await settingsFor("busy");
    expect(settings?.scanStartedAt).toEqual(held);
    // The slot itself is untouched — only the lease moved, so the retry still
    // knows which slot it is serving.
    expect(settings?.nextScanAt).toEqual(anchor);
    assert.ok(settings?.scanLeaseUntil);
    expect(settings.scanLeaseUntil.getTime()).toBeGreaterThanOrEqual(
      before + GEO_SCAN_START_LEASE_MS
    );
    expect(settings.scanLeaseUntil.getTime()).toBeLessThanOrEqual(
      Date.now() + GEO_SCAN_START_LEASE_MS
    );
  });

  test("a slot a finished attempt already covered advances without a second scan", async () => {
    // A manual scan is in flight when the daily slot comes due.
    const anchor = wholeMinutesAgo(60);
    await seedProject("manual", { nextScanAt: anchor });
    const held = await Effect.runPromise(claimGeoScanRun("manual"));
    assert.ok(held);
    expect((await sweep()).alreadyRunning).toBe(1);
    expect(startWorkflow).not.toHaveBeenCalled();

    // It finishes (stamping `last_scan_at`, the last *attempt*) and frees the
    // slot, then the sweep's lease expires.
    await Effect.runPromise(markGeoScanFinished("manual", held.claimedAt));
    await expireGeoScanLease("manual");

    expect(await sweep()).toMatchObject({
      due: 1,
      started: 0,
      covered: 1,
      alreadyRunning: 0,
      failed: 0,
      advanceLost: 0,
    });
    expect(startWorkflow).not.toHaveBeenCalled();
    const settings = await settingsFor("manual");
    // Same time of day as the original anchor, one interval on.
    expect(settings?.nextScanAt).toEqual(new Date(anchor.getTime() + DAY_MS));
    expect(settings?.scanLeaseUntil).toBeNull();
  });

  test("the coverage check is atomic with the claim, so a scan finishing mid-sweep cannot be doubled", async () => {
    // The sweep read `last_scan_at` before this attempt finished; by the time
    // it claims, the finish has freed the slot and stamped the attempt.
    const anchor = wholeMinutesAgo(60);
    await seedProject("race", { nextScanAt: anchor, scanStartedAt: null });
    await Effect.runPromise(markGeoScanFinished("race"));

    // A plain claim would succeed (slot is free)...
    // ...but the sweep's claim refuses because the slot is already covered.
    expect(
      await Effect.runPromise(
        claimGeoScanRun("race", { unlessFinishedAfter: anchor })
      )
    ).toBeNull();
    expect((await settingsFor("race"))?.scanStartedAt).toBeNull();

    // The sweep then resolves the refused claim as a covered slot, not as
    // "already running", and advances without a second scan.
    expect(await sweep()).toMatchObject({
      due: 1,
      started: 0,
      covered: 1,
      alreadyRunning: 0,
    });
    expect(startWorkflow).not.toHaveBeenCalled();
    expect((await settingsFor("race"))?.nextScanAt).toEqual(
      new Date(anchor.getTime() + DAY_MS)
    );
  });

  test.each([60, -60])(
    "covered catch-up preserves the next unserved slot (%s minutes ago)",
    async (minutesAgo) => {
      const nextSlot = wholeMinutesAgo(minutesAgo);
      const anchor = new Date(nextSlot.getTime() - DAY_MS);
      await seedProject("covered-outage", {
        nextScanAt: anchor,
        lastScanAt: new Date(anchor.getTime() + 30 * 60_000),
      });

      expect(await sweep()).toMatchObject({ covered: 1, started: 0 });
      expect((await settingsFor("covered-outage"))?.nextScanAt).toEqual(
        nextSlot
      );
      expect(startWorkflow).not.toHaveBeenCalled();
      expect((await sweep()).started).toBe(minutesAgo > 0 ? 1 : 0);
    }
  );

  test("a migrated null slot keeps its anchor across an ambiguous hand-off and retry", async () => {
    const now = new Date("2026-09-06T12:00:30Z");
    setSystemTime(now);
    try {
      await seedProject("null-retry", { nextScanAt: null });
      startWorkflow.mockImplementationOnce(() =>
        Effect.fail(new Error("Request timed out"))
      );
      expect((await sweep()).failed).toBe(1);
      const settings = await settingsFor("null-retry");
      expect(settings?.nextScanAt).toEqual(new Date("2026-09-06T12:00:00Z"));
      assert.ok(settings?.scanStartedAt);

      setSystemTime(new Date(now.getTime() + 10 * 60_000));
      await Effect.runPromise(
        markGeoScanFinished("null-retry", settings.scanStartedAt)
      );
      setSystemTime(new Date(now.getTime() + GEO_SCAN_STALE_MS + 60_000));
      expect(await sweep()).toMatchObject({ covered: 1, started: 0 });
      expect(startWorkflow).toHaveBeenCalledTimes(1);
      expect((await settingsFor("null-retry"))?.nextScanAt).toEqual(
        new Date("2026-09-07T12:00:00Z")
      );
    } finally {
      setSystemTime();
    }
  });

  test.each(["interval", "anchor"])(
    "lease rejects a %s changed after the due lookup",
    async (changed) => {
      const anchor = wholeMinutesAgo(60);
      const newAnchor = wholeMinutesAgo(30);
      await seedProject("first", {
        nextScanAt: new Date(anchor.getTime() - 60_000),
      });
      await seedProject("changed", { nextScanAt: anchor });
      startWorkflow.mockImplementationOnce(() =>
        Effect.promise(async () => {
          await testDb
            .update(geoSettings)
            .set(
              changed === "interval"
                ? { scanIntervalHours: 48 }
                : { nextScanAt: newAnchor }
            )
            .where(eq(geoSettings.projectId, "changed"));
          return { runId: "workflow-test" };
        })
      );

      expect(await sweep()).toMatchObject({ started: 1, leaseLost: 1 });
      expect((await settingsFor("changed"))?.scanStartedAt).toBeNull();
      expect((await sweep()).started).toBe(1);
      expect((await settingsFor("changed"))?.nextScanAt).toEqual(
        new Date(
          changed === "interval"
            ? anchor.getTime() + 2 * DAY_MS
            : newAnchor.getTime() + DAY_MS
        )
      );
    }
  );

  test("a failed hand-off retries within the lease window and keeps the slot's time of day", async () => {
    const anchor = wholeMinutesAgo(60);
    await seedProject("start-failure", { nextScanAt: anchor });
    startWorkflow.mockImplementationOnce(() =>
      Effect.fail(
        Object.assign(new Error("503"), { name: "InternalDashboardError" })
      )
    );
    const before = Date.now();
    expect(await sweep()).toMatchObject({ due: 1, started: 0, failed: 1 });
    const leased = await settingsFor("start-failure");
    expect(leased?.nextScanAt).toEqual(anchor);
    assert.ok(leased?.scanLeaseUntil);
    expect(leased.scanLeaseUntil.getTime()).toBeGreaterThanOrEqual(
      before + GEO_SCAN_START_LEASE_MS
    );
    expect(leased.scanLeaseUntil.getTime()).toBeLessThan(before + DAY_MS);
    // The row is not due again until the lease expires.
    expect((await sweep()).due).toBe(0);

    await expireGeoScanLease("start-failure");
    expect((await sweep()).started).toBe(1);
    expect(startWorkflow).toHaveBeenCalledTimes(2);
    const settings = await settingsFor("start-failure");
    // Exactly one interval past the slot it was serving: the retry cost
    // minutes, not a day, and did not shift the time of day.
    expect(settings?.nextScanAt).toEqual(new Date(anchor.getTime() + DAY_MS));
    expect(settings?.scanLeaseUntil).toBeNull();
  });

  test("a stale lease cannot overwrite the slot another sweep advanced", async () => {
    const anchor = wholeMinutesAgo(60);
    await seedProject("stolen", { nextScanAt: anchor });
    // The hand-off takes so long that the lease expires and another sweep
    // takes over the row mid-flight.
    const stolenLease = new Date(Date.now() + GEO_SCAN_START_LEASE_MS * 2);
    startWorkflow.mockImplementationOnce(() =>
      Effect.promise(async () => {
        await testDb
          .update(geoSettings)
          .set({ scanLeaseUntil: stolenLease })
          .where(eq(geoSettings.projectId, "stolen"));
        return { runId: "workflow-test" };
      })
    );
    // The scan is running and billed, so it counts as started; the lost
    // schedule write is reported separately.
    expect(await sweep()).toMatchObject({
      due: 1,
      started: 1,
      advanceLost: 1,
    });
    const settings = await settingsFor("stolen");
    expect(settings?.nextScanAt).toEqual(anchor);
    expect(settings?.scanLeaseUntil).toEqual(stolenLease);
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
      covered: 0,
      leaseLost: 0,
      alreadyRunning: 0,
      failed: 1,
      advanceLost: 0,
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
    // The slot was already more than an interval overdue, so it is given up
    // rather than retried, and the row is no longer due.
    const refused = await settingsFor("refused");
    expect(refused?.scanLeaseUntil).toBeNull();
    expect(refused?.nextScanAt?.getTime()).toBeGreaterThan(Date.now());
    expect((await sweep()).due).toBe(0);
  });

  test("a persistently refused hand-off backs off to the stale window and finally gives up the slot", async () => {
    const anchor = wholeMinutesAgo(30);
    await seedProject("refusing", { nextScanAt: anchor });
    startWorkflow.mockImplementation(() =>
      Effect.fail(
        Object.assign(new Error("503"), { name: "InternalDashboardError" })
      )
    );

    // Three lease cycles: each failure backs the retry off to a full stale
    // window instead of the 15-minute start lease, so a refusing project
    // cannot burn a scan row every ten minutes.
    for (let attempt = 1; attempt <= 3; attempt++) {
      const before = Date.now();
      expect(await sweep()).toMatchObject({ due: 1, started: 0, failed: 1 });
      const settings = await settingsFor("refusing");
      expect(settings?.nextScanAt).toEqual(anchor);
      assert.ok(settings?.scanLeaseUntil);
      expect(settings.scanLeaseUntil.getTime()).toBeGreaterThanOrEqual(
        before + GEO_SCAN_STALE_MS
      );
      expect(startWorkflow).toHaveBeenCalledTimes(attempt);
      // While the lease holds, no sweep touches the project at all.
      expect((await sweep()).due).toBe(0);
      await expireGeoScanLease("refusing");
    }

    // Once the slot is a whole interval overdue the sweep stops retrying it
    // and moves to the next slot on the cadence.
    const overdue = new Date(anchor.getTime() - DAY_MS);
    await testDb
      .update(geoSettings)
      .set({ nextScanAt: overdue, scanLeaseUntil: null })
      .where(eq(geoSettings.projectId, "refusing"));
    expect(await sweep()).toMatchObject({ due: 1, started: 0, failed: 1 });
    const abandoned = await settingsFor("refusing");
    expect(abandoned?.scanLeaseUntil).toBeNull();
    expect(abandoned?.nextScanAt).toEqual(nextGeoScanAtAfter(24, overdue));
    expect((await sweep()).due).toBe(0);
    expect(startWorkflow).toHaveBeenCalledTimes(4);
  });

  test("an ambiguous timeout holds the claim and running row to prevent duplicate billing", async () => {
    await seedProject("timeout");
    startWorkflow.mockImplementationOnce(() =>
      Effect.fail(new Error("Request timed out"))
    );
    expect((await sweep()).failed).toBe(1);
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
      covered: 0,
      leaseLost: 0,
      alreadyRunning: 0,
      failed: 0,
      advanceLost: 0,
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
  test.each([true, false, undefined])(
    "a completed scan only covers the scheduled slot when not scoped (%s)",
    async (scoped) => {
      const anchor = wholeMinutesAgo(60);
      const previousFinish = new Date(anchor.getTime() - DAY_MS);
      const scope = await seedProject("scoped-finish", {
        nextScanAt: anchor,
        lastScanAt: previousFinish,
      });
      const claim = await Effect.runPromise(claimGeoScanRun(scope.projectId));
      assert.ok(claim);
      const scanId = await Effect.runPromise(createGeoScanRow(scope));
      await Effect.runPromise(
        finalizeGeoScanProject(
          {
            ...scope,
            scanId,
            runId: "run-test",
            companyName: "Notra",
            aliases: [],
            startedAtMs: Date.now(),
            scoped,
            gate: {
              allowed: true,
              mode: "unmetered",
              featureId: null,
              reserved: false,
              lockId: null,
              useMarkup: false,
            },
          },
          {
            checks: 1,
            mentions: 0,
            dropped: 0,
            usage: EMPTY_AGENT_TOKEN_USAGE,
          },
          "completed",
          claim.claimedAt.toISOString()
        ).pipe(
          Effect.provideService(GeoContentBillingService, {
            gateContentBilling: () => Effect.die("Unexpected billing gate"),
            finalizeContentBilling: () => Effect.void,
          })
        )
      );

      const settings = await settingsFor(scope.projectId);
      expect(settings?.scanStartedAt).toBeNull();
      expect((await testDb.select().from(geoScans))[0]?.status).toBe(
        "completed"
      );
      if (scoped) {
        expect(settings?.lastScanAt).toEqual(previousFinish);
      } else {
        expect(settings?.lastScanAt?.getTime()).toBeGreaterThan(
          anchor.getTime()
        );
      }
      expect(await sweep()).toMatchObject({
        started: scoped ? 1 : 0,
        covered: scoped ? 0 : 1,
      });
    }
  );

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
