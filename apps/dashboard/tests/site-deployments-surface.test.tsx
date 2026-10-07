import { expect, mock, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { renderToStaticMarkup } from "react-dom/server";
import { IntlProvider } from "use-intl";

import messages from "../messages/en.json";
import type { SiteDeploymentsTableProps } from "../src/types/components/sites";
import type { SiteDeployment, SiteDetail } from "../src/types/sites";

if (!process.env.NOTRA_DEPLOYMENTS_SURFACE_TEST_WORKER) {
  test("unified deployments surface", () => {
    const result = spawnSync(
      process.execPath,
      ["test", fileURLToPath(import.meta.url)],
      {
        cwd: fileURLToPath(new URL("../../..", import.meta.url)),
        env: { ...process.env, NOTRA_DEPLOYMENTS_SURFACE_TEST_WORKER: "1" },
        timeout: 30_000,
      }
    );
    expect(result.status, result.stderr?.toString()).toBe(0);
  });
} else {
  let environment: string | null = null;
  let deployments = [
    { id: "production", kind: "production", status: "ready" },
    {
      id: "preview",
      kind: "preview",
      status: "building",
      previewKey: "branch-feature",
      branch: "feature",
      createdAt: new Date("2026-10-07"),
    },
  ] as SiteDeployment[];
  const detail = {
    site: { status: "active", productionBranch: "main" },
    deployments: [],
    previews: [
      {
        previewKey: "branch-old",
        deploymentId: "old-live",
        visibility: "protected",
        activatedAt: "2026-10-01",
        url: "https://preview.example",
        branch: "old",
        commitSha: null,
        commitMessage: null,
        pullRequestNumber: null,
      },
    ],
  } as unknown as SiteDetail;

  mock.module("../src/components/sites/site-context", () => ({
    useSite: () => ({
      organizationId: "org",
      organizationSlug: "acme",
      siteId: "site",
      detail,
    }),
  }));
  mock.module("../src/lib/hooks/use-site-deployments", () => ({
    useSiteDeploymentsList: () => ({ data: deployments }),
    useDeployLatest: () => ({ isPending: false, mutate: () => undefined }),
  }));
  mock.module("../src/lib/navigation", () => ({
    useSearchParams: () =>
      new URLSearchParams(environment ? { environment } : {}),
    useRouter: () => ({ replace: () => undefined }),
  }));
  mock.module(
    "../src/components/sites/site-deployment-preview-controls",
    () => ({
      SiteDeploymentPreviewControls: () => (
        <div data-preview-controls="true">
          Preview access and branch creation
        </div>
      ),
    })
  );
  mock.module("../src/components/sites/site-deployments-table", () => ({
    SiteDeploymentsTable: ({
      deployments: rows,
      previewRows,
    }: SiteDeploymentsTableProps) => (
      <div data-deployments-table="true">
        {rows.map((row) => (
          <span key={row.id}>{row.id}</span>
        ))}
        <div data-preview-actions="true">
          {previewRows?.map((row) => row.deploymentId).join(",")}
        </div>
      </div>
    ),
  }));
  const { SiteDeploymentsPage } =
    await import("../src/components/sites/pages/site-deployments-page");
  const render = () =>
    renderToStaticMarkup(
      <IntlProvider locale="en" messages={messages} timeZone="UTC">
        <SiteDeploymentsPage />
      </IntlProvider>
    );

  test("all environments share one deployment table and preserve older live pointers", () => {
    environment = null;
    const html = render();
    expect(html.match(/data-deployments-table/g)).toHaveLength(1);
    expect(html).toContain("<span>production</span>");
    expect(html).toContain("<span>preview</span>");
    expect(html).toContain("old-live");
    expect(html).toContain("data-preview-controls");
  });

  test("legacy preview filter selects only preview records on the shared page", () => {
    environment = "preview";
    const html = render();
    expect(html).toContain("<span>preview</span>");
    expect(html).not.toContain("<span>production</span>");
    expect(html).toContain("Deployments");
  });

  test("production filtering and invalid filter fail open to all environments", () => {
    environment = "production";
    expect(render()).not.toContain("<span>preview</span>");
    environment = "unknown";
    expect(render()).toContain("<span>preview</span>");
  });

  test("empty history retains environment filters and preview management", () => {
    deployments = [];
    environment = "preview";
    const html = render();
    expect(html).toContain(
      messages.sites.deploymentsPage.filters.searchPlaceholder
    );
    expect(html).toContain(messages.sites.deploymentsPage.filters.label);
    expect(html).not.toContain('data-slot="select-trigger"');
    expect(html).toContain("data-preview-controls");
    expect(html).toContain("old-live");
  });
}
