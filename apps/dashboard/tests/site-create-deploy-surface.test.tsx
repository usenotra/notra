import { expect, mock, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import type { ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { IntlProvider } from "use-intl";

import messages from "../messages/en.json";
import type { SiteDeploymentStatus } from "../src/types/sites";

if (!process.env.NOTRA_DEPLOY_SURFACE_TEST_WORKER) {
  test("creation deployment log surface", () => {
    const result = spawnSync(
      process.execPath,
      ["test", fileURLToPath(import.meta.url)],
      {
        cwd: fileURLToPath(new URL("../../..", import.meta.url)),
        env: { ...process.env, NOTRA_DEPLOY_SURFACE_TEST_WORKER: "1" },
        timeout: 30_000,
      }
    );
    expect(result.status, result.stderr?.toString()).toBe(0);
  });
} else {
  let status: SiteDeploymentStatus = "building";
  let log: string | null = null;
  let hasRecord = true;
  let configMissing = false;
  mock.module("@tanstack/react-query", () => ({
    useQuery: () => ({
      data: { deployments: hasRecord ? [{ id: "deployment" }] : [] },
    }),
  }));
  mock.module("../src/lib/orpc/query", () => ({
    dashboardOrpc: { sites: { get: { queryOptions: () => ({}) } } },
  }));
  mock.module("../src/lib/hooks/use-site-deployments", () => ({
    useSiteDeployment: () => ({
      data: {
        deployment: hasRecord
          ? {
              status,
              createdAt: "2026-10-07T00:00:00Z",
              startedAt: null,
              finishedAt: null,
              buildDurationMs: 1000,
              diagnostics: configMissing ? [{ code: "config_missing" }] : [],
            }
          : null,
        log,
      },
    }),
  }));
  mock.module("../src/lib/hooks/use-now", () => ({
    useNow: () => Date.parse("2026-10-07T00:00:01Z"),
  }));
  mock.module("../src/components/framework/link", () => ({
    default: ({ children, ...props }: ComponentProps<"a">) => (
      <a {...props}>{children}</a>
    ),
  }));
  const { SiteBuildLogs } =
    await import("../src/components/sites/site-build-logs");
  const { SiteCreateDeploy } =
    await import("../src/components/sites/site-create-deploy");

  test("an empty live build has one toolbar status and one spinner", () => {
    const html = renderToStaticMarkup(
      <IntlProvider locale="en" messages={messages} timeZone="UTC">
        <SiteCreateDeploy
          deploymentQueued
          organizationId="organization"
          organizationSlug="organization"
          site={{ id: "site", liveUrl: "https://site.example" }}
        />
      </IntlProvider>
    );
    expect(html.match(/Deployment started/g)).toHaveLength(1);
    expect(html.match(/motion-safe:animate-spin/g)).toHaveLength(1);
    expect(html).not.toContain(messages.sites.deploymentPage.log.streaming);
    expect(html).toContain("h-44");
    expect(html).not.toContain("h-80");
    expect(html.match(/rounded-xl border/g)).toHaveLength(1);
    expect(html).toContain(messages.sites.deploymentPage.log.starting);
    expect(html).toContain(messages.sites.deploymentPage.log.copy);
  });

  test("actual log output keeps the filter and a bounded log viewport", () => {
    log = "12:00:00 Building site\n12:00:01 Built site";
    const html = renderToStaticMarkup(
      <IntlProvider locale="en" messages={messages} timeZone="UTC">
        <SiteCreateDeploy
          deploymentQueued
          organizationId="organization"
          organizationSlug="organization"
          site={{ id: "site", liveUrl: "https://site.example" }}
        />
      </IntlProvider>
    );
    expect(html).toContain("h-72");
    expect(html).toContain('role="log"');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain(messages.sites.deploymentPage.log.filter);
    expect(html).toContain("Building site");
    expect(html).not.toContain(messages.sites.deploymentPage.log.streaming);
  });

  test.each(["failed", "canceled", "ready"] as const)(
    "%s deployments keep their headline and actions",
    (nextStatus) => {
      status = nextStatus;
      const html = renderToStaticMarkup(
        <IntlProvider locale="en" messages={messages} timeZone="UTC">
          <SiteCreateDeploy
            deploymentQueued
            organizationId="organization"
            organizationSlug="organization"
            site={{ id: "site", liveUrl: "https://site.example" }}
          />
        </IntlProvider>
      );
      expect(html).toContain(messages.sites.new.deploy.openSite);
      if (nextStatus === "ready") {
        expect(html).toContain("Your site is live.");
        expect(html).toContain('href="https://site.example"');
      } else {
        expect(html).toContain(messages.sites.new.deploy.failed);
        expect(html).toContain(messages.sites.new.deploy.viewDeployment);
      }
      expect(html).not.toContain("motion-safe:animate-spin");
    }
  );

  test("a deployment that was not queued has no empty log box", () => {
    status = "queued";
    const html = renderToStaticMarkup(
      <IntlProvider locale="en" messages={messages} timeZone="UTC">
        <SiteCreateDeploy
          deploymentQueued={false}
          organizationId="organization"
          organizationSlug="organization"
          site={{ id: "site", liveUrl: "https://site.example" }}
        />
      </IntlProvider>
    );
    expect(html.replaceAll("&#x27;", "'")).toContain(
      messages.sites.new.deploy.notStarted
    );
    expect(html).toContain(messages.sites.new.deploy.openSite);
    expect(html).not.toContain(messages.sites.deploymentPage.log.copy);
    expect(html).not.toContain("motion-safe:animate-spin");
  });

  test("waiting for the first deployment retains a single live status", () => {
    hasRecord = false;
    log = null;
    const html = renderToStaticMarkup(
      <IntlProvider locale="en" messages={messages} timeZone="UTC">
        <SiteCreateDeploy
          deploymentQueued
          organizationId="organization"
          organizationSlug="organization"
          site={{ id: "site", liveUrl: "https://site.example" }}
        />
      </IntlProvider>
    );
    expect(html).toContain(messages.sites.new.deploy.waiting);
    expect(html.match(/motion-safe:animate-spin/g)).toHaveLength(1);
    expect(html).not.toContain(messages.sites.new.deploy.openSite);
  });

  test("legacy missing configuration retains retry guidance and PR link", () => {
    hasRecord = true;
    status = "failed";
    configMissing = true;
    const html = renderToStaticMarkup(
      <IntlProvider locale="en" messages={messages} timeZone="UTC">
        <SiteCreateDeploy
          deploymentQueued
          organizationId="organization"
          organizationSlug="organization"
          site={{ id: "site", liveUrl: "https://site.example" }}
          starterPullRequestUrl="https://github.example/repository/pull/1"
        />
      </IntlProvider>
    );
    expect(html).toContain(messages.sites.new.deploy.failed);
    expect(html).toContain(messages.sites.new.deploy.configMissingRetry);
    expect(html).toContain('href="https://github.example/repository/pull/1"');
  });

  test("shared logs retain their default summary and sizing without a heading", () => {
    const html = renderToStaticMarkup(
      <IntlProvider locale="en" messages={messages} timeZone="UTC">
        <SiteBuildLogs inProgress log="Building site" queued={false} />
      </IntlProvider>
    );
    expect(html).toContain(messages.sites.deploymentPage.log.streaming);
    expect(html).toContain("max-h-[min(30rem,60vh)]");
    expect(html).not.toContain("h-72");
  });
}
