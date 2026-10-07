import { beforeEach, expect, mock, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { GitBranchIcon } from "@hugeicons/core-free-icons";
import { renderToStaticMarkup } from "react-dom/server";

import type { dashboardOrpc } from "../src/lib/orpc/query";

if (!process.env.NOTRA_SITE_BRANCH_SUGGESTIONS_TEST_WORKER) {
  test("repository-backed Production branch suggestions", () => {
    const result = spawnSync(
      process.execPath,
      ["test", fileURLToPath(import.meta.url)],
      {
        cwd: fileURLToPath(new URL("../../..", import.meta.url)),
        env: {
          ...process.env,
          NOTRA_SITE_BRANCH_SUGGESTIONS_TEST_WORKER: "1",
        },
        timeout: 30_000,
      }
    );
    expect(result.status, result.stderr?.toString()).toBe(0);
  });
} else {
  const repositoryData = {
    branches: ["main", "release", "feature/docs"],
    defaultBranch: "main",
    configDirectories: ["", "docs"],
    contentCounts: {},
  };
  const releaseData = {
    ...repositoryData,
    configDirectories: ["release-docs"],
  };
  let baseData: typeof repositoryData | undefined;
  let branchData: typeof repositoryData | undefined;
  let pending = false;
  let queryIndex = 0;
  const query = mock(
    (_options: { enabled: boolean; staleTime: number; retry: boolean }) => ({
      data: queryIndex++ < 2 ? baseData : branchData,
      isPending: pending,
    })
  );
  const siteOptions = mock(
    (
      options: Parameters<
        typeof dashboardOrpc.sites.siteRepositorySuggestions.queryOptions
      >[0]
    ) => options
  );
  const repositoryOptions = mock(
    (
      options: Parameters<
        typeof dashboardOrpc.sites.repositorySuggestions.queryOptions
      >[0]
    ) => options
  );
  mock.module("@tanstack/react-query", () => ({ useQuery: query }));
  mock.module("../src/lib/orpc/query", () => ({
    dashboardOrpc: {
      sites: {
        siteRepositorySuggestions: { queryOptions: siteOptions },
        repositorySuggestions: { queryOptions: repositoryOptions },
      },
    },
  }));
  const { useRepositorySuggestions } =
    await import("../src/lib/hooks/use-repository-suggestions");
  const { SiteSuggestInput } =
    await import("../src/components/sites/site-suggest-input");

  beforeEach(() => {
    baseData = repositoryData;
    branchData = undefined;
    pending = false;
    queryIndex = 0;
    query.mockClear();
    siteOptions.mockClear();
    repositoryOptions.mockClear();
  });

  test("settings use the organization and site scope, not repository import access", () => {
    const result = useRepositorySuggestions({
      organizationId: "org-current",
      siteId: "site_current",
      branch: "main",
    });
    expect(result.branches).toEqual(repositoryData.branches);
    expect(siteOptions.mock.calls[0]?.[0]?.input).toEqual({
      organizationId: "org-current",
      siteId: "site_current",
      ref: undefined,
    });
    expect(query.mock.calls.map(([options]) => options.enabled)).toEqual([
      true,
      false,
      false,
      false,
    ]);
    expect(query.mock.calls.every(([options]) => options.retry === false)).toBe(
      true
    );
  });

  test("a known non-default branch scans its directories without replacing the branch list", () => {
    branchData = releaseData;
    const result = useRepositorySuggestions({
      organizationId: "org-current",
      siteId: "site_current",
      branch: "release",
    });
    expect(siteOptions.mock.calls[1]?.[0]?.input).toEqual({
      organizationId: "org-current",
      siteId: "site_current",
      ref: "release",
    });
    expect(query.mock.calls[2]?.[0]?.enabled).toBe(true);
    expect(result.branches).toEqual(repositoryData.branches);
    expect(result.configDirectories).toEqual(["release-docs"]);
  });

  test("custom branch text does not trigger a scan of a nonexistent GitHub ref", () => {
    const result = useRepositorySuggestions({
      organizationId: "org-current",
      siteId: "site_current",
      branch: "custom/not-yet-pushed",
    });
    expect(query.mock.calls[2]?.[0]?.enabled).toBe(false);
    expect(siteOptions.mock.calls[1]?.[0]?.input).toEqual({
      organizationId: "org-current",
      siteId: "site_current",
      ref: undefined,
    });
    expect(result.configDirectories).toEqual(repositoryData.configDirectories);
  });

  test("loading and unavailable GitHub suggestions leave a safe empty result", () => {
    baseData = undefined;
    pending = true;
    expect(
      useRepositorySuggestions({
        organizationId: "org-current",
        siteId: "site_current",
        branch: "custom/current",
      })
    ).toEqual({
      branches: [],
      defaultBranch: null,
      configDirectories: [],
      contentCounts: undefined,
      isLoading: true,
    });
    queryIndex = 0;
    pending = false;
    expect(
      useRepositorySuggestions({
        organizationId: "org-current",
        siteId: "site_current",
        branch: "custom/current",
      }).isLoading
    ).toBe(false);
  });

  test("repository import suggestions retain their independent query scope", () => {
    useRepositorySuggestions({
      organizationId: "org-current",
      repositoryId: "repository-current",
      branch: "main",
    });
    expect(repositoryOptions.mock.calls[0]?.[0]?.input).toEqual({
      organizationId: "org-current",
      repositoryId: "repository-current",
      ref: undefined,
    });
    expect(query.mock.calls.map(([options]) => options.enabled)).toEqual([
      false,
      true,
      false,
      false,
    ]);
  });

  test.each([[[]], [repositoryData.branches]])(
    "the real autocomplete preserves the current custom value with suggestions %j",
    (suggestions) => {
      const html = renderToStaticMarkup(
        <SiteSuggestInput
          emptyLabel="No matching branch"
          icon={GitBranchIcon}
          id="production-branch"
          onValueChange={() => {}}
          suggestions={suggestions}
          value="custom/current"
        />
      );
      expect(html).toContain('value="custom/current"');
      expect(html).toContain('id="production-branch"');
      expect(html).toContain('role="combobox"');
      expect(html).not.toContain(' disabled=""');
    }
  );
}
