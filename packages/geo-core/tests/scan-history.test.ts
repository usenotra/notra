import "./utils/infrastructure";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "bun:test";

import { geoMentionChecks, geoScans, geoSettings } from "@notra/db/schema";
import { eq } from "drizzle-orm";
import { Effect } from "effect";

import { GEO_SCAN_STALE_MS } from "../src/constants/geo";
import {
  GEO_SCAN_RESULTS_PAGE_SIZE,
  GEO_SCAN_RUNS_PAGE_SIZE,
} from "../src/constants/geo-scan-history";
import {
  database,
  initializeDatabase,
  resetDatabase,
  seedProject,
  testDb,
} from "./utils/database";

const { loadGeoScanRun, loadGeoScanRuns } =
  await import("../src/geo/scan-history");
const { updateGeoScanTaskStatus } = await import("../src/geo/scan-task-status");
const { geoScanAnswerKey } = await import("../src/utils/geo-scan-plan");
const { loadGeoPromptHistory } = await import("../src/geo/programs");

beforeAll(initializeDatabase, 30_000);
afterAll(() => database.postgres.close());
beforeEach(resetDatabase);

describe("scan history", () => {
  test("scan-specific prompt history includes both languages and excludes other runs and projects", async () => {
    const scope = await seedProject("languages");
    const other = await seedProject("other");
    await testDb.insert(geoScans).values([
      { id: "selected", ...scope },
      { id: "older", ...scope },
      { id: "foreign", ...other },
    ]);
    await testDb.insert(geoMentionChecks).values(
      [
        { id: "german", ...scope, scanId: "selected", language: "German" },
        { id: "english", ...scope, scanId: "selected", language: "English" },
        { id: "old", ...scope, scanId: "older", language: "English" },
        {
          id: "other-project",
          ...other,
          scanId: "foreign",
          language: "English",
        },
      ].map((row) => ({
        ...row,
        promptId: "custom-prompt",
        prompt: row.language,
        engine: "engine",
        answer: row.language,
        mentioned: false,
        capturedAt: new Date(),
      }))
    );
    const history = await Effect.runPromise(
      loadGeoPromptHistory({
        ...scope,
        promptId: "custom-prompt",
        scanId: "selected",
      })
    );
    expect(history.checks.map((check) => check.language).sort()).toEqual([
      "English",
      "German",
    ]);
    expect(history.checks.every((check) => check.scanId === "selected")).toBe(
      true
    );
    const foreign = await Effect.runPromise(
      loadGeoPromptHistory({
        ...scope,
        promptId: "custom-prompt",
        scanId: "foreign",
      })
    );
    expect(foreign.checks).toEqual([]);
    const legacy = await Effect.runPromise(
      loadGeoPromptHistory({ ...scope, promptId: "custom-prompt" })
    );
    expect(legacy.checks.every((check) => check.language === "English")).toBe(
      true
    );
    expect(legacy.checks).toHaveLength(2);
  });

  test("pending pages are independent of saved pages and clamp as the queue shrinks", async () => {
    const scope = await seedProject("pending-pages");
    const tasks = Array.from(
      { length: GEO_SCAN_RESULTS_PAGE_SIZE + 1 },
      (_, index) => ({
        key: geoScanAnswerKey(String(index), "engine", "English"),
        promptId: String(index),
        prompt: `Question ${index}`,
        engine: "engine",
        language: "English",
      })
    );
    await testDb.insert(geoScans).values({
      id: "pending-scan",
      ...scope,
      plan: {
        totalChecks: tasks.length,
        promptCount: tasks.length,
        sequenceCount: 0,
        engines: ["engine"],
        languages: ["English"],
        tasks,
        taskStates: {},
      },
    });
    const first = await Effect.runPromise(
      loadGeoScanRun({ ...scope, scanId: "pending-scan", offset: 0 })
    );
    const second = await Effect.runPromise(
      loadGeoScanRun({
        ...scope,
        scanId: "pending-scan",
        offset: 0,
        pendingOffset: GEO_SCAN_RESULTS_PAGE_SIZE,
      })
    );
    expect(first?.pending).toHaveLength(GEO_SCAN_RESULTS_PAGE_SIZE);
    expect(second?.pending.map((task) => task.promptId)).toEqual([
      String(GEO_SCAN_RESULTS_PAGE_SIZE),
    ]);
    expect(second?.total).toBe(0);
    await testDb.insert(geoMentionChecks).values({
      id: "now-saved",
      ...scope,
      scanId: "pending-scan",
      promptId: "0",
      engine: "engine",
      language: "English",
      prompt: "Question 0",
      answer: "Answer",
      mentioned: false,
      capturedAt: new Date(),
    });
    const shrunk = await Effect.runPromise(
      loadGeoScanRun({
        ...scope,
        scanId: "pending-scan",
        offset: 0,
        pendingOffset: GEO_SCAN_RESULTS_PAGE_SIZE,
      })
    );
    expect(shrunk?.pendingOffset).toBe(0);
    expect(shrunk?.pending).toHaveLength(GEO_SCAN_RESULTS_PAGE_SIZE);
    expect(shrunk?.total).toBe(1);
  });

  test("tracks queued and concurrent active answers and replaces persisted tasks", async () => {
    const scope = await seedProject("progress");
    const context = { ...scope, scanId: "progress-scan" };
    const tasks = ["German", "English"].map((language) => ({
      prompt: { id: "prompt", text: `Question in ${language}` },
      engine: "engine-a",
      language,
    }));
    const plan = {
      totalChecks: 2,
      promptCount: 1,
      sequenceCount: 0,
      engines: ["engine-a"],
      languages: ["German", "English"],
      tasks: tasks.map((task) => ({
        key: geoScanAnswerKey(task.prompt.id, task.engine, task.language),
        promptId: task.prompt.id,
        prompt: task.prompt.text,
        engine: task.engine,
        language: task.language,
      })),
      taskStates: {},
    };
    await testDb.insert(geoScans).values({
      id: context.scanId,
      ...scope,
      plan,
      planSummary: {
        plannedChecks: 2,
        hasTasks: true,
        engines: ["engine-a"],
        taskCounts: [{ engine: "engine-a", plannedChecks: 2, failedChecks: 0 }],
      },
    });
    const queued = await Effect.runPromise(
      loadGeoScanRun({ ...context, offset: 0 })
    );
    expect(queued?.pending.map((task) => task.status)).toEqual([
      "queued",
      "queued",
    ]);
    await Promise.all(
      tasks.map((task) =>
        Effect.runPromise(updateGeoScanTaskStatus(context, task, "running"))
      )
    );
    const active = await Effect.runPromise(
      loadGeoScanRun({ ...context, offset: 0 })
    );
    expect(active?.pending.map((task) => task.status)).toEqual([
      "running",
      "running",
    ]);
    const firstTask = tasks[0];
    if (!firstTask) {
      throw new Error("Expected a GEO scan task fixture");
    }
    await Effect.runPromise(
      updateGeoScanTaskStatus(context, firstTask, "failed")
    );
    let [scan] = await testDb
      .select({ planSummary: geoScans.planSummary })
      .from(geoScans)
      .where(eq(geoScans.id, context.scanId));
    expect(scan?.planSummary?.taskCounts[0]?.failedChecks).toBe(1);
    await Effect.runPromise(
      updateGeoScanTaskStatus(context, firstTask, "running")
    );
    [scan] = await testDb
      .select({ planSummary: geoScans.planSummary })
      .from(geoScans)
      .where(eq(geoScans.id, context.scanId));
    expect(scan?.planSummary?.taskCounts[0]?.failedChecks).toBe(0);
    await testDb.insert(geoMentionChecks).values({
      ...scope,
      id: "saved-german",
      mentioned: false,
      scanId: context.scanId,
      promptId: "prompt",
      prompt: "Question in German",
      language: "German",
      engine: "engine-a",
      answer: "Answer",
      capturedAt: new Date(),
    });
    const saved = await Effect.runPromise(
      loadGeoScanRun({ ...context, offset: 0 })
    );
    expect(saved?.results).toHaveLength(1);
    expect(saved?.pending).toHaveLength(1);
    expect(saved?.pending[0]?.language).toBe("English");
    await testDb
      .update(geoScans)
      .set({ status: "failed" })
      .where(eq(geoScans.id, context.scanId));
    const failed = await Effect.runPromise(
      loadGeoScanRun({ ...context, offset: 0 })
    );
    expect(failed?.pending[0]?.status).toBe("failed");
  });

  test("polling finalizes expired runs only in the requested project", async () => {
    const scope = await seedProject("expired");
    const other = await seedProject("other");
    const startedAt = new Date(Date.now() - GEO_SCAN_STALE_MS - 60_000);
    await testDb.insert(geoScans).values([
      { id: "expired-scan", ...scope, startedAt },
      { id: "other-scan", ...other, startedAt },
    ]);
    const response = await Effect.runPromise(
      loadGeoScanRuns({ ...scope, offset: 0 })
    );
    expect(response.runs[0]?.status).toBe("failed");
    expect(response.runs[0]?.finishedAt).not.toBeNull();
    const detail = await Effect.runPromise(
      loadGeoScanRun({ ...scope, scanId: "expired-scan", offset: 0 })
    );
    expect(detail?.status).toBe("failed");
    const untouched = await testDb.query.geoScans.findFirst({
      where: eq(geoScans.id, "other-scan"),
    });
    expect(untouched?.status).toBe("running");
  });

  test("keeps a long run alive while its project claim is fresh", async () => {
    const scope = await seedProject("alive");
    await testDb
      .update(geoSettings)
      .set({ scanStartedAt: new Date() })
      .where(eq(geoSettings.projectId, scope.projectId));
    await testDb.insert(geoScans).values({
      id: "alive-scan",
      ...scope,
      startedAt: new Date(Date.now() - GEO_SCAN_STALE_MS - 60_000),
    });
    const detail = await Effect.runPromise(
      loadGeoScanRun({ ...scope, scanId: "alive-scan", offset: 0 })
    );
    expect(detail?.status).toBe("running");
    const response = await Effect.runPromise(
      loadGeoScanRuns({ ...scope, offset: 0 })
    );
    expect(response.runs[0]?.status).toBe("running");
    expect(response.runs[0]?.finishedAt).toBeNull();
  });

  test("scopes history and detail to the selected project and organization", async () => {
    const selected = await seedProject("selected");
    const other = await seedProject("other");
    const foreign = await seedProject("foreign", {
      organizationId: "other-org",
    });
    await testDb.insert(geoScans).values([
      { id: "selected-scan", ...selected },
      { id: "other-scan", ...other },
      { id: "foreign-scan", ...foreign },
    ]);
    const history = await Effect.runPromise(
      loadGeoScanRuns({ ...selected, offset: 0 })
    );
    expect(history.runs.map((run) => run.id)).toEqual(["selected-scan"]);
    expect(
      await Effect.runPromise(
        loadGeoScanRun({ ...selected, scanId: "other-scan", offset: 0 })
      )
    ).toBeNull();
    expect(
      await Effect.runPromise(
        loadGeoScanRun({ ...selected, scanId: "foreign-scan", offset: 0 })
      )
    ).toBeNull();
  });

  test("counts saved answers, pages newest results first, and filters by engine", async () => {
    const scope = await seedProject("selected");
    const savedCount = GEO_SCAN_RESULTS_PAGE_SIZE + 2;
    const plan = {
      totalChecks: savedCount + 5,
      promptCount: 6,
      sequenceCount: 0,
      engines: ["engine-a", "engine-b"],
      languages: ["English"],
    };
    await testDb.insert(geoScans).values({ id: "scan", ...scope, plan });
    await testDb.insert(geoMentionChecks).values(
      Array.from({ length: savedCount }, (_, index) => ({
        id: `check-${index}`,
        ...scope,
        scanId: "scan",
        promptId: `prompt-${index}`,
        prompt: `Question ${index}`,
        engine: index === savedCount - 1 ? "engine-b" : "engine-a",
        answer: "Saved answer",
        mentioned: index < 3,
        capturedAt: new Date(1_000_000_000_000 + index * 1000),
        sources: [
          { url: "https://example.com/shared", title: null },
          { url: `https://example.com/${index}`, title: null },
        ],
      }))
    );
    const history = await Effect.runPromise(
      loadGeoScanRuns({ ...scope, offset: 0 })
    );
    expect(history.runs[0]).toMatchObject({
      plan,
      checks: savedCount,
      mentions: 3,
      status: "running",
    });
    const detail = await Effect.runPromise(
      loadGeoScanRun({ ...scope, scanId: "scan", offset: 0 })
    );
    expect(detail?.total).toBe(savedCount);
    expect(detail?.results).toHaveLength(GEO_SCAN_RESULTS_PAGE_SIZE);
    expect(detail?.results[0]?.id).toBe(`check-${savedCount - 1}`);
    expect(detail?.results[0]).not.toHaveProperty("answer");
    const second = await Effect.runPromise(
      loadGeoScanRun({
        ...scope,
        scanId: "scan",
        offset: GEO_SCAN_RESULTS_PAGE_SIZE,
      })
    );
    expect(second?.results).toHaveLength(2);
    expect(
      second?.results.some((row) =>
        detail?.results.some((first) => first.id === row.id)
      )
    ).toBe(false);
    const filtered = await Effect.runPromise(
      loadGeoScanRun({
        ...scope,
        scanId: "scan",
        offset: 0,
        engine: "engine-b",
      })
    );
    expect(filtered?.total).toBe(1);
    expect(filtered?.results[0]?.engine).toBe("engine-b");
  });

  test("unscoped answers page across scans with the newest first", async () => {
    const scope = await seedProject("feed");
    await testDb.insert(geoScans).values([
      { id: "older", ...scope, status: "completed", startedAt: new Date(1) },
      { id: "live", ...scope, status: "running", startedAt: new Date(2) },
    ]);
    await testDb.insert(geoMentionChecks).values([
      {
        id: "old-answer",
        ...scope,
        scanId: "older",
        promptId: "p1",
        prompt: "old",
        engine: "engine",
        answer: "old",
        mentioned: false,
        capturedAt: new Date(1_000),
      },
      {
        id: "live-answer",
        ...scope,
        scanId: "live",
        promptId: "p2",
        prompt: "live",
        engine: "engine",
        answer: "live",
        mentioned: true,
        capturedAt: new Date(2_000),
      },
    ]);
    const feed = await Effect.runPromise(
      loadGeoScanRun({ ...scope, offset: 0 })
    );
    expect(feed?.results.map((row) => row.id)).toEqual([
      "live-answer",
      "old-answer",
    ]);
    expect(feed?.results[0]?.scanId).toBe("live");
    expect(feed?.total).toBe(2);
  });

  test("paginates tied timestamps deterministically and supports legacy runs", async () => {
    const scope = await seedProject("selected");
    const startedAt = new Date("2026-09-09T12:00:00Z");
    await testDb.insert(geoScans).values(
      Array.from({ length: 12 }, (_, index) => ({
        id: `scan-${index.toString().padStart(2, "0")}`,
        ...scope,
        startedAt,
        status: "completed" as const,
      }))
    );
    const first = await Effect.runPromise(
      loadGeoScanRuns({ ...scope, offset: 0 })
    );
    const second = await Effect.runPromise(
      loadGeoScanRuns({ ...scope, offset: GEO_SCAN_RUNS_PAGE_SIZE })
    );
    expect(first.hasMore).toBe(true);
    expect(second.hasMore).toBe(false);
    expect(first.runs).toHaveLength(10);
    expect(second.runs).toHaveLength(2);
    expect(
      new Set([...first.runs, ...second.runs].map((run) => run.id)).size
    ).toBe(12);
    expect(first.runs[0]?.plan).toBeNull();
    expect(first.runs[0]?.checks).toBe(0);
  });
});
