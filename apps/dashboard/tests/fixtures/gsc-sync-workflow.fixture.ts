import { beforeEach, expect, mock, test } from "bun:test";

import type { GscSyncResult } from "@notra/geo-core/types/google-search-console";
import { FatalError } from "workflow";

import { dashboardOrpc } from "../../src/lib/orpc/query";

const listProjects = mock(async () => ({
  projectIds: ["project-a", "project-b"],
  startedAt: 0,
}));
const syncProject = mock(
  async (
    _organizationId: string,
    _projectId: string
  ): Promise<GscSyncResult> => ({
    status: "completed",
    keywords: 1,
    suggestionsAdded: 1,
  })
);
const track = mock(
  async (_organizationId: string, _result: GscSyncResult, _startedAt: number) =>
    undefined
);
const appendLog = mock(async (_input: { status: string }) => undefined);
const refreshGaps = mock(
  async (_input: { organizationId: string; projectId: string }) => undefined
);

mock.module("../../src/workflows/steps/gsc-sync-steps", () => ({
  listGscSyncProjectsStep: listProjects,
  runGscProjectSyncStep: syncProject,
  trackGscSyncStep: track,
}));
mock.module("../../src/workflows/steps/content-generation-steps", () => ({
  fetchLogRetention: async () => 30,
  appendAutomationLogBestEffort: appendLog,
}));
mock.module("../../src/workflows/steps/refresh-geo-content-gaps", () => ({
  refreshGeoContentGapsStep: refreshGaps,
}));

const { gscSyncWorkflow } = await import("../../src/workflows/gsc-sync");
const disconnectCall = mock(async () => ({ disconnected: true }));
const analyzeCall = mock(async (): Promise<GscSyncResult> => ({
  status: "completed",
  keywords: 1,
  suggestionsAdded: 0,
}));
const originalGeo = dashboardOrpc.geo;
mock.module("../../src/lib/orpc/query", () => ({
  dashboardOrpc: {
    geo: new Proxy(originalGeo, {
      get(target, key) {
        if (key === "searchConsoleDisconnect") {
          return { ...target.searchConsoleDisconnect, call: disconnectCall };
        }
        if (key === "searchConsoleSync" || key === "searchConsoleSelectSite") {
          return { ...Reflect.get(target, key), call: analyzeCall };
        }
        return Reflect.get(target, key);
      },
    }),
  },
}));

beforeEach(() => {
  listProjects.mockClear();
  syncProject.mockReset();
  track.mockClear();
  appendLog.mockClear();
  refreshGaps.mockClear();
  syncProject.mockResolvedValue({
    status: "completed",
    keywords: 1,
    suggestionsAdded: 1,
  });
});

test("a failed project does not mark an earlier project's sync as completed", async () => {
  syncProject.mockImplementation(async (_organizationId, projectId) => {
    if (projectId === "project-b") {
      throw new Error("Search Console unavailable");
    }
    return { status: "completed", keywords: 1, suggestionsAdded: 1 };
  });
  await expect(
    gscSyncWorkflow({ organizationId: "org-test" })
  ).rejects.toBeInstanceOf(FatalError);
  expect(syncProject.mock.calls.map((call) => call[1])).toEqual([
    "project-a",
    "project-b",
  ]);
  expect(appendLog.mock.calls[0]?.[0]).toMatchObject({ status: "failed" });
  expect(track.mock.calls[0]?.[1]).toMatchObject({ status: "failed" });
});

test("reauth skips are preserved when no project syncs", async () => {
  syncProject.mockResolvedValue({
    status: "skipped",
    reason: "reauth_required",
  });
  expect(await gscSyncWorkflow({ organizationId: "org-test" })).toMatchObject({
    status: "skipped",
    reason: "reauth_required",
  });
});

test("successful project steps aggregate their results", async () => {
  expect(await gscSyncWorkflow({ organizationId: "org-test" })).toEqual({
    status: "completed",
    keywords: 2,
    suggestionsAdded: 2,
  });
  expect(appendLog.mock.calls[0]?.[0]).toMatchObject({ status: "success" });
  expect(refreshGaps.mock.calls.map(([scope]) => scope.projectId)).toEqual([
    "project-a",
    "project-b",
  ]);
});

test("a failed snapshot refresh leaves a committed Search Console sync successful", async () => {
  refreshGaps.mockImplementationOnce(async () => {
    throw new Error("Snapshot unavailable");
  });

  expect(await gscSyncWorkflow({ organizationId: "org-test" })).toEqual({
    status: "completed",
    keywords: 2,
    suggestionsAdded: 2,
  });
  expect(track.mock.calls[0]?.[1]).toMatchObject({ status: "completed" });
  expect(refreshGaps).toHaveBeenCalledTimes(2);
  expect(appendLog.mock.calls.map(([entry]) => entry.status)).toEqual([
    "failed",
    "success",
  ]);
  expect(appendLog.mock.calls[0]?.[0]).toMatchObject({
    title: "Content gaps could not refresh for project-a",
    errorMessage: "Snapshot unavailable",
  });
});
