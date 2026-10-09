import { describe, expect, mock, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import type { ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { IntlProvider } from "use-intl";

import de from "../messages/de.json";
import en from "../messages/en.json";
import type { SiteBuildLogsProps } from "../src/types/components/sites";

if (!process.env.NOTRA_SITE_DEFAULTS_TEST_WORKER) {
  test("defaults-first setup UI", () => {
    const result = spawnSync(
      process.execPath,
      ["test", fileURLToPath(import.meta.url)],
      {
        cwd: fileURLToPath(new URL("../../..", import.meta.url)),
        env: { ...process.env, NOTRA_SITE_DEFAULTS_TEST_WORKER: "1" },
        timeout: 30_000,
      }
    );
    expect(result.status, result.stderr?.toString()).toBe(0);
  });
} else {
  let hasConfig = false;
  let diagnosticCode = "config_missing";
  const site = {
    id: "site",
    name: "Example blog",
    liveUrl: "https://site.example",
    repository: { owner: "example", name: "blog" },
    productionBranch: "main",
    rootDirectory: "",
  };
  const mutate = mock(() => {});
  mock.module("../src/lib/hooks/use-site-starter", () => ({
    useSiteStarterStatus: () => ({ data: { hasConfig } }),
    useCreateSiteStarter: () => ({ isPending: false, mutate }),
  }));
  mock.module("@tanstack/react-query", () => ({
    useQuery: () => ({ data: { deployments: [{ id: "deployment" }] } }),
  }));
  mock.module("../src/lib/orpc/query", () => ({
    dashboardOrpc: { sites: { get: { queryOptions: () => ({}) } } },
  }));
  mock.module("../src/lib/hooks/use-site-deployments", () => ({
    useSiteDeployment: () => ({
      data: {
        deployment: {
          status: "failed",
          branch: "main",
          commitSha: "abc123",
          errorMessage: null,
          createdAt: "2026-10-07T00:00:00Z",
          diagnostics: [
            {
              code: diagnosticCode,
              severity: "error",
              message: "Example build diagnostic",
            },
          ],
        },
        log: null,
      },
    }),
  }));
  mock.module("../src/lib/hooks/use-now", () => ({
    useNow: () => Date.parse("2026-10-07T00:00:01Z"),
  }));
  mock.module("../src/components/sites/site-build-logs", () => ({
    SiteBuildLogs: ({ heading }: SiteBuildLogsProps) => heading ?? null,
  }));
  mock.module("../src/components/framework/link", () => ({
    default: ({ children, ...props }: ComponentProps<"a">) => (
      <a {...props}>{children}</a>
    ),
  }));
  const { SiteCreateStarter } =
    await import("../src/components/sites/site-create-starter");
  const { SiteCreateDeploy } =
    await import("../src/components/sites/site-create-deploy");

  describe.each([
    ["en", en],
    ["de", de],
  ] as const)("%s defaults-first setup", (locale, messages) => {
    test(`${locale}: missing config offers defaults and an optional starter`, () => {
      hasConfig = false;
      const html = renderToStaticMarkup(
        <IntlProvider locale={locale} messages={messages} timeZone="UTC">
          <SiteCreateStarter
            branch="main"
            onPullRequestOpened={() => {}}
            organizationId="organization"
            pullRequestUrl={null}
            repositoryId="repository"
            rootDirectory=""
          />
        </IntlProvider>
      );
      expect(html).toContain(messages.sites.new.starter.missing);
      expect(html).toContain(messages.sites.new.starter.create);
      expect(html).toContain('type="button"');
      expect(mutate).not.toHaveBeenCalled();
      expect(messages.sites.new.create).toBe(
        locale === "en" ? "Create & deploy" : "Erstellen & deployen"
      );
    });

    test(`${locale}: an open starter PR does not require a merge`, () => {
      const html = renderToStaticMarkup(
        <IntlProvider locale={locale} messages={messages} timeZone="UTC">
          <SiteCreateStarter
            branch="main"
            onPullRequestOpened={() => {}}
            organizationId="organization"
            pullRequestUrl="https://github.example/repository/pull/1"
            repositoryId="repository"
            rootDirectory=""
          />
        </IntlProvider>
      );
      expect(html).toContain(messages.sites.new.starter.optional);
      expect(html).toContain(messages.sites.new.starter.view);
      expect(html).toContain('href="https://github.example/repository/pull/1"');
      expect(html).not.toContain("<button");
    });

    test(`${locale}: legacy missing-config failures offer retry without a PR`, () => {
      diagnosticCode = "config_missing";
      const html = renderToStaticMarkup(
        <IntlProvider locale={locale} messages={messages} timeZone="UTC">
          <SiteCreateDeploy
            deploymentQueued
            organizationId="organization"
            organizationSlug="organization"
            site={site}
          />
        </IntlProvider>
      );
      expect(html).toContain(messages.sites.new.deploy.configMissingRetry);
      expect(html).toContain(messages.sites.new.deploy.viewDeployment);
      expect(html).toContain(messages.common.labels.copyAgentPrompt);
      expect(html).not.toContain(messages.sites.new.deploy.openSite);
      expect(html).not.toContain(messages.sites.new.deploy.viewPullRequest);
    });
  });

  test("repositories with configuration need no starter offer", () => {
    hasConfig = true;
    expect(
      renderToStaticMarkup(
        <IntlProvider locale="en" messages={en} timeZone="UTC">
          <SiteCreateStarter
            branch="main"
            onPullRequestOpened={() => {}}
            organizationId="organization"
            pullRequestUrl={null}
            repositoryId="repository"
            rootDirectory=""
          />
        </IntlProvider>
      )
    ).toBe("");
  });

  test("other build failures keep their existing error semantics", () => {
    diagnosticCode = "compile_failed";
    const html = renderToStaticMarkup(
      <IntlProvider locale="en" messages={en} timeZone="UTC">
        <SiteCreateDeploy
          deploymentQueued
          organizationId="organization"
          organizationSlug="organization"
          site={site}
          starterPullRequestUrl="https://github.example/repository/pull/1"
        />
      </IntlProvider>
    );
    expect(html).toContain(en.sites.new.deploy.failed);
    expect(html).not.toContain(en.sites.new.deploy.configMissingRetry);
    expect(html).not.toContain(en.sites.new.deploy.viewPullRequest);
  });
}
