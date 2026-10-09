import { expect, mock, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import type { ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { IntlProvider } from "use-intl";

import messages from "../messages/en.json";
import type { SiteDeploymentStatus } from "../src/types/sites";
import { buildSiteBuildAgentPrompt } from "../src/utils/site-build-agent-prompt";
import { findMatches, parseBuildLog } from "../src/utils/site-build-log";

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
  const site = {
    id: "site",
    name: "Example blog",
    liveUrl: "https://site.example",
    repository: { owner: "example", name: "blog" },
    productionBranch: "main",
    rootDirectory: "apps/blog",
  };
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
              branch: "main",
              commitSha: "abc123",
              errorMessage: null,
              createdAt: "2026-10-07T00:00:00Z",
              startedAt: null,
              finishedAt: null,
              buildDurationMs: 1000,
              diagnostics: configMissing
                ? [
                    {
                      code: "config_missing",
                      severity: "error",
                      message: "Missing blog.json",
                    },
                  ]
                : [],
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
  const { SiteBuildLogRows } =
    await import("../src/components/sites/site-build-log-rows");
  const { SiteCreateDeploy } =
    await import("../src/components/sites/site-create-deploy");

  test("an empty live build has one toolbar status and one spinner", () => {
    const html = renderToStaticMarkup(
      <IntlProvider locale="en" messages={messages} timeZone="UTC">
        <SiteCreateDeploy
          deploymentQueued
          organizationId="organization"
          organizationSlug="organization"
          site={site}
        />
      </IntlProvider>
    );
    expect(html.match(/Deployment started/g)).toHaveLength(1);
    expect(html.match(/motion-safe:animate-spin/g)).toHaveLength(1);
    expect(html).not.toContain(messages.sites.deploymentPage.log.streaming);
    expect(html).toContain("min-h-28");
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
          site={site}
        />
      </IntlProvider>
    );
    expect(html).toContain("h-48");
    expect(html).toContain('data-streaming="true"');
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
            site={site}
          />
        </IntlProvider>
      );
      if (nextStatus === "ready") {
        expect(html).toContain(messages.sites.new.deploy.openSite);
        expect(html).not.toContain(messages.common.labels.copyAgentPrompt);
        expect(html).toContain("Your site is live.");
        expect(html).toContain('href="https://site.example"');
      } else {
        expect(html).toContain(messages.sites.new.deploy.failed);
        expect(html).toContain(
          'class="inline-flex items-center gap-2 text-destructive"'
        );
        expect(html).not.toContain("mt-0.5 size-4 shrink-0");
        expect(html).toContain(messages.sites.new.deploy.viewDeployment);
        expect(html).not.toContain(messages.sites.new.deploy.openSite);
        expect(html).not.toContain('href="https://site.example"');
        expect(html).toContain(messages.common.labels.copyAgentPrompt);
        expect(
          html.indexOf(messages.common.labels.copyAgentPrompt)
        ).toBeLessThan(html.indexOf(messages.sites.new.deploy.viewDeployment));
        expect(html).toContain("me-auto");
        expect(html).toContain("min-h-24");
        expect(html).toContain("max-h-48");
        expect(html).toContain('data-streaming="false"');
        expect(html).not.toContain(" h-48");
      }
      expect(html).not.toContain("motion-safe:animate-spin");
    }
  );

  test("a deployment that was not queued has no empty log box", () => {
    status = "queued";
    hasRecord = false;
    const html = renderToStaticMarkup(
      <IntlProvider locale="en" messages={messages} timeZone="UTC">
        <SiteCreateDeploy
          deploymentQueued={false}
          organizationId="organization"
          organizationSlug="organization"
          site={site}
        />
      </IntlProvider>
    );
    expect(html.replaceAll("&#x27;", "'")).toContain(
      messages.sites.new.deploy.notStarted
    );
    expect(html).not.toContain(messages.sites.new.deploy.openSite);
    expect(html).toContain(messages.common.labels.copyAgentPrompt);
    expect(html).toContain(messages.sites.new.deploy.viewDeployment);
    expect(html).toContain('href="/organization/sites/site/deployments"');
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
          site={site}
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
          site={site}
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

  test("short errors collapse the timestamp gutter and redundant error marker", () => {
    const html = renderToStaticMarkup(
      <IntlProvider locale="en" messages={messages} timeZone="UTC">
        <SiteBuildLogs
          heading="Build failed"
          inProgress={false}
          log="✘ blog/example.mdx  Same URL as blog/example.md\nBuild failed"
          queued={false}
        />
      </IntlProvider>
    );
    expect(html).toContain('data-timestamps="false"');
    expect(html).toContain("min-h-24");
    expect(html).toContain("max-h-48");
    expect(html).toContain("Same URL as blog/example.md");
    expect(html).not.toContain("✘");
    expect(html).toContain("group-data-[timestamps=false]/log:hidden");
  });

  test("the repair prompt includes repository context, diagnostics and clean logs", () => {
    const prompt = buildSiteBuildAgentPrompt({
      site,
      deployment: {
        status: "failed",
        branch: "fix/blog",
        commitSha: "abc123",
        errorMessage: "Build failed",
        diagnostics: [
          {
            severity: "error",
            code: "duplicate_url",
            file: "blog/example.mdx",
            message: "Same URL as blog/example.md",
          },
        ],
      },
      log: "\u001b[31m✘ blog/example.mdx  Same URL as blog/example.md\u001b[0m",
    });
    for (const text of [
      "Example blog",
      "example/blog",
      "fix/blog",
      "apps/blog",
      "abc123",
      "duplicate_url",
      "blog/example.mdx",
      "Same URL as blog/example.md",
      "do not blindly delete content",
      "push commits or deploy without explicit approval",
    ]) {
      expect(prompt).toContain(text);
    }
    expect(prompt).not.toContain("\u001b");
  });

  test.each([
    ["✘ blog/example.mdx", "✘"],
    ["✘ blog/example.mdx", "✘ blog"],
    ["× blog/example.mdx", "× blog"],
    ["[error] Failed build", "[error]"],
    ["[error] Failed build", "[error] Failed"],
  ])("log searches retain and highlight %s matching %s", (log, query) => {
    const lines = parseBuildLog(log);
    const matchingLines = lines.filter(
      (line) => findMatches(line.text, query).length > 0
    );
    expect(matchingLines).toHaveLength(1);
    const html = renderToStaticMarkup(
      <IntlProvider locale="en" messages={messages} timeZone="UTC">
        <SiteBuildLogRows
          entries={[]}
          matchingLines={matchingLines}
          offsets={new Map()}
          query={query}
        />
      </IntlProvider>
    );
    expect(
      [...html.matchAll(/<mark[^>]*>(.*?)<\/mark>/g)].map((match) => match[1])
    ).toContain(query);
  });

  test("a missing build result produces a usable prompt without inventing logs", () => {
    const prompt = buildSiteBuildAgentPrompt({
      site,
      deployment: null,
      log: null,
    });
    expect(prompt).toContain("The first deployment could not start");
    expect(prompt).toContain("Branch: main");
    expect(prompt).toContain("No build log is available.");
    expect(prompt).not.toContain("Commit:");
  });
}
