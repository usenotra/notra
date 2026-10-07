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
  database,
  initializeDatabase,
  resetDatabase,
  seedProject,
  testDb,
} from "./utils/database";

const { loadGeoScanRun, loadGeoScanRuns } =
  await import("../src/geo/scan-history");
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
});
