import { beforeEach, expect, mock, test } from "bun:test";

import type { GscSyncResult } from "@notra/geo-core/types/google-search-console";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { FatalError } from "workflow";

import { GeoProjectProvider } from "../src/components/providers/geo-project-provider";
import { dashboardOrpc } from "../src/lib/orpc/query";

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

mock.module("../src/workflows/steps/gsc-sync-steps", () => ({
  listGscSyncProjectsStep: listProjects,
  runGscProjectSyncStep: syncProject,
  trackGscSyncStep: track,
}));
mock.module("../src/workflows/steps/content-generation-steps", () => ({
  fetchLogRetention: async () => 30,
  appendAutomationLogBestEffort: appendLog,
}));

const { gscSyncWorkflow } = await import("../src/workflows/gsc-sync");
const disconnectCall = mock(async () => ({ disconnected: true }));
const analyzeCall = mock(async (): Promise<GscSyncResult> => ({
  status: "completed",
  keywords: 1,
  suggestionsAdded: 0,
}));
const originalGeo = dashboardOrpc.geo;
mock.module("../src/lib/orpc/query", () => ({
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
// A separate module identity avoids unrelated tests' partial use-geo mocks.
const isolatedHookPath = "../src/lib/hooks/use-geo.ts?gsc-disconnect-test";
const { useGscAnalyzing, useGscDisconnect, useGscSelectSite, useGscSync } =
  (await import(isolatedHookPath)) as typeof import("../src/lib/hooks/use-geo");

beforeEach(() => {
  listProjects.mockClear();
  syncProject.mockReset();
  track.mockClear();
  appendLog.mockClear();
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
});

test("disconnect invalidates cached queries for both projects but not other organizations", async () => {
  const client = new QueryClient();
  const result: { current?: ReturnType<typeof useGscDisconnect> } = {};
  function DisconnectHook() {
    result.current = useGscDisconnect("org-test");
    return null;
  }
  const status = {
    configured: true,
    connected: true,
    email: null,
    siteUrl: null,
    status: "active" as const,
    lastSyncedAt: null,
    lastError: null,
    weeklySyncScheduled: false,
    sites: [],
  };
  for (const query of [
    dashboardOrpc.geo.searchConsoleStatus,
    dashboardOrpc.geo.searchConsoleKeywords,
    dashboardOrpc.geo.suggestionsList,
  ]) {
    for (const projectId of ["project-a", "project-b"]) {
      client.setQueryData(
        query.queryKey({ input: { organizationId: "org-test", projectId } }),
        status
      );
    }
  }
  const sitesKey = dashboardOrpc.geo.searchConsoleSites.queryKey({
    input: { organizationId: "org-test" },
  });
  client.setQueryData(sitesKey, status);
  const otherKey = dashboardOrpc.geo.searchConsoleStatus.queryKey({
    input: { organizationId: "other", projectId: "project-c" },
  });
  client.setQueryData(otherKey, status);
  renderToString(
    createElement(
      QueryClientProvider,
      { client },
      createElement(DisconnectHook)
    )
  );
  await result.current?.mutateAsync();
  expect(disconnectCall).toHaveBeenCalledWith({ organizationId: "org-test" });
  for (const query of [
    dashboardOrpc.geo.searchConsoleStatus,
    dashboardOrpc.geo.searchConsoleKeywords,
    dashboardOrpc.geo.suggestionsList,
  ]) {
    for (const projectId of ["project-a", "project-b"]) {
      expect(
        client.getQueryState(
          query.queryKey({ input: { organizationId: "org-test", projectId } })
        )?.isInvalidated
      ).toBe(true);
    }
  }
  expect(client.getQueryState(sitesKey)?.isInvalidated).toBe(true);
  expect(client.getQueryState(otherKey)?.isInvalidated).toBe(false);
});

test("Search Console analysis mutations and pending state are project-scoped", async () => {
  const client = new QueryClient();
  const result: {
    sync?: ReturnType<typeof useGscSync>;
    select?: ReturnType<typeof useGscSelectSite>;
  } = {};
  function AnalyzeHook() {
    result.sync = useGscSync("org-test");
    result.select = useGscSelectSite("org-test");
    return null;
  }
  renderToString(
    createElement(
      QueryClientProvider,
      { client },
      createElement(
        GeoProjectProvider,
        {
          projectId: "project-a",
        } as Parameters<typeof GeoProjectProvider>[0],
        createElement(AnalyzeHook)
      )
    )
  );
  await result.sync?.mutateAsync();
  await result.select?.mutateAsync({ siteUrl: "sc-domain:example.com" });
  expect(analyzeCall).toHaveBeenCalledWith({
    organizationId: "org-test",
    projectId: "project-a",
  });
  expect(
    client
      .getMutationCache()
      .getAll()
      .map((mutation) => mutation.options.mutationKey)
  ).toEqual([
    ["gsc-analyze", "org-test", "project-a"],
    ["gsc-analyze", "org-test", "project-a"],
  ]);

  const pending = client.getMutationCache().build(client, {
    mutationKey: ["gsc-analyze", "org-test", "project-a"],
    mutationFn: async () => undefined,
  });
  const running = pending.execute(undefined);
  function CheckingHook() {
    return createElement("output", null, String(useGscAnalyzing("org-test")));
  }
  function checking(projectId: string) {
    return renderToString(
      createElement(
        QueryClientProvider,
        { client },
        createElement(
          GeoProjectProvider,
          {
            projectId,
          } as Parameters<typeof GeoProjectProvider>[0],
          createElement(CheckingHook)
        )
      )
    );
  }
  expect(checking("project-a")).toContain("true");
  expect(checking("project-b")).toContain("false");
  await running;
});
