import { beforeEach, expect, mock, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  githubIntegrations,
  organizations,
  siteDeployments,
  sites,
} from "@notra/db/schema";
import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";

import type { SiteDeployment } from "../src/types/deployments";
import type { PreviewCommentParams } from "../src/types/github";
import type { Site } from "../src/types/sites";
import type {
  PreviewCommentFixture,
  PreviewPullRequestFixture,
} from "./types/preview-comments";

if (process.env.NOTRA_PREVIEW_COMMENTS_TEST_WORKER !== "1") {
  test("PR preview comments with isolated synthetic GitHub and database adapters", () => {
    const result = spawnSync(
      process.execPath,
      ["test", fileURLToPath(import.meta.url)],
      {
        env: { ...process.env, NOTRA_PREVIEW_COMMENTS_TEST_WORKER: "1" },
        timeout: 30_000,
      }
    );
    expect(result.status, result.stderr?.toString()).toBe(0);
  }, 35_000);
} else {
  process.env.GITHUB_APP_ID = "123";
  process.env.APP_URL = "https://dashboard.example.test";
  let site: Site;
  let deployment: SiteDeployment;
  let latest: SiteDeployment;
  let comments: PreviewCommentFixture[];
  let pr: PreviewPullRequestFixture;
  let failComments = false;
  let failChecks = false;
  let transactionTail = Promise.resolve();
  const dialect = new PgDialect();
  const execute = mock(async (query: SQL) => {
    expect(dialect.sqlToQuery(query).params[0]).toBe(
      "sites-preview-comment:site_docs:42"
    );
  });
  const adapter = {
    execute,
    select: () => ({
      from: (table: unknown) => {
        const rows = () => {
          if (table === sites) {
            return [site];
          }
          if (table === siteDeployments) {
            return [latest];
          }
          if (table === organizations) {
            return [{ slug: "acme" }];
          }
          if (table === githubIntegrations) {
            return [{ id: "integration" }];
          }
          throw new Error("Unexpected table");
        };
        const builder = {
          where: () => builder,
          innerJoin: () => builder,
          orderBy: () => builder,
          limit: () => builder,
          for: () => builder,
          then: (resolve: (value: unknown[]) => unknown) =>
            Promise.resolve(rows()).then(resolve),
        };
        return builder;
      },
    }),
    update: () => ({ set: () => ({ where: async () => {} }) }),
    transaction: async (run: (tx: unknown) => Promise<unknown>) => {
      const previous = transactionTail;
      let release = () => {};
      transactionTail = new Promise<void>((resolve) => {
        release = resolve;
      });
      await previous;
      try {
        return await run(adapter);
      } finally {
        release();
      }
    },
  };
  mock.module("@notra/db/drizzle", () => ({ db: adapter }));
  mock.module("@notra/ai/integrations/github", () => ({
    createScopedGitHubAppInstallationToken: async () => "synthetic-token",
  }));
  const request = mock(
    async (route: string, input: Record<string, unknown>) => {
      if (route.endsWith("/pulls/{pull_number}")) {
        return { data: pr };
      }
      if (route.startsWith("GET ") && route.endsWith("/comments")) {
        const offset = (Number(input.page) - 1) * Number(input.per_page);
        return {
          data: comments.slice(offset, offset + Number(input.per_page)),
        };
      }
      if (route.includes("/check-runs")) {
        if (failChecks) {
          throw new Error("Synthetic check failure");
        }
        return { data: { id: 9 } };
      }
      if (failComments) {
        throw new Error("Synthetic comment failure");
      }
      if (route.startsWith("POST ")) {
        comments.push({
          id: 101,
          body: String(input.body),
          user: { type: "Bot" },
          performed_via_github_app: { id: 123 },
        });
      } else {
        const comment = comments.find((entry) => entry.id === input.comment_id);
        if (!comment) {
          throw new Error("Missing comment");
        }
        comment.body = String(input.body);
      }
      return { data: { id: 101 } };
    }
  );
  mock.module("@notra/ai/utils/octokit", () => ({
    createOctokit: () => ({ request }),
    GITHUB_INTERACTIVE_READ_TIMEOUT_MS: 15_000,
  }));
  const { requireSiteRepository, upsertPreviewComment } =
    await import("../src/github");
  const { openCheckRun, reportOutcome } = await import("../src/reporting");

  beforeEach(() => {
    site = {
      id: "site_docs",
      organizationId: "org_acme",
      slug: "docs",
      repositoryId: "integration",
      githubRepositoryId: "100",
      githubInstallationId: "200",
      repositoryOwner: "acme",
      repositoryName: "docs",
      productionBranch: "main",
      previewsEnabled: true,
      previewCommentsEnabled: true,
      status: "active",
      previewVisibility: "protected",
      previewPassword: null,
    } as Site;
    deployment = {
      id: "dep_first",
      siteId: site.id,
      kind: "preview",
      previewKey: "pr-42",
      pullRequestNumber: 42,
      commitSha: "abcdef1234",
      generation: 1,
      status: "building",
      checkRunId: "9",
      target: {
        publicOrigin: "https://pr-42.docs.example.test",
        mounts: { blog: "/blog" },
      },
    } as SiteDeployment;
    latest = deployment;
    comments = [];
    pr = {
      state: "open",
      head: { sha: deployment.commitSha, repo: { id: 100 } },
      base: { ref: "main", repo: { id: 100 } },
    };
    failChecks = false;
    failComments = false;
    request.mockClear();
    execute.mockClear();
  });

  test("concurrent starts create one comment; live and failed builds update it", async () => {
    await Promise.all([
      openCheckRun(site, deployment),
      openCheckRun(site, deployment),
    ]);
    expect(comments).toHaveLength(1);
    expect(execute).toHaveBeenCalledTimes(2);
    expect(comments[0]?.body).toContain("Building preview");
    expect(comments[0]?.body).not.toContain("Open preview");
    deployment.status = "ready";
    await reportOutcome(site, deployment, { kind: "live" });
    expect(comments).toHaveLength(1);
    expect(comments[0]?.body).toContain("Preview ready");
    expect(comments[0]?.body).toContain("https://pr-42.docs.example.test/blog");
    expect(comments[0]?.body).toContain("This preview is protected");
    expect(comments[0]?.body).not.toContain("token=");
    latest = {
      ...deployment,
      id: "dep_second",
      status: "failed",
      generation: 2,
    };
    await reportOutcome(site, latest, {
      kind: "failed",
      summary: "private-log-secret",
      diagnostics: [],
    });
    expect(comments).toHaveLength(1);
    expect(comments[0]?.body).toContain("Build failed");
    expect(comments[0]?.body).not.toContain("Open preview");
    expect(comments[0]?.body).not.toContain("private-log-secret");
  });

  test("older builds and late starts cannot overwrite a newer or finished build", async () => {
    await openCheckRun(site, deployment);
    latest = { ...deployment, id: "dep_new", generation: 2, status: "ready" };
    await reportOutcome(site, latest, { kind: "live" });
    const ready = comments[0]?.body;
    await reportOutcome(site, deployment, {
      kind: "failed",
      summary: "old",
      diagnostics: [],
    });
    await openCheckRun(site, latest);
    await reportOutcome(site, latest, {
      kind: "failed",
      summary: "stale attempt",
      diagnostics: [],
    });
    expect(comments[0]?.body).toBe(ready);
  });

  test("password previews never expose credentials; public previews need no access hint", async () => {
    deployment.status = "ready";
    site.previewPassword = {
      algorithm: "PBKDF2-SHA256",
      hash: "private-password-hash",
      salt: "private-password-salt",
      iterations: 100_000,
      version: "private-password-version",
      updatedAt: "2026-10-08T12:00:00Z",
    };
    await reportOutcome(site, deployment, { kind: "live" });
    expect(comments[0]?.body).toContain("use the preview password");
    expect(comments[0]?.body).not.toContain("private-password");
    site.previewVisibility = "public";
    await reportOutcome(site, deployment, { kind: "live" });
    expect(comments[0]?.body).toContain("Open preview");
    expect(comments[0]?.body).not.toContain("protected");
  });

  test("production and manual branch previews do not post PR comments", async () => {
    await openCheckRun(site, { ...deployment, kind: "production" });
    await openCheckRun(site, { ...deployment, pullRequestNumber: null });
    expect(comments).toHaveLength(0);
    expect(execute).not.toHaveBeenCalled();
  });

  test.each(["previewCommentsEnabled", "previewsEnabled"] as const)(
    "current %s=false stops comments without suppressing checks",
    async (flag) => {
      const snapshot = { ...site };
      site[flag] = false;
      deployment.status = "ready";
      await reportOutcome(snapshot, deployment, { kind: "live" });
      expect(comments).toHaveLength(0);
      expect(
        request.mock.calls.some(([route]) => route.includes("/check-runs"))
      ).toBe(true);
    }
  );

  test("comments work when creating the GitHub check fails, and comment errors never fail a build", async () => {
    deployment.checkRunId = null;
    failChecks = true;
    await expect(openCheckRun(site, deployment)).resolves.toBe(deployment);
    deployment.status = "ready";
    await reportOutcome(site, deployment, { kind: "live" });
    expect(comments[0]?.body).toContain("Preview ready");
    failComments = true;
    deployment.status = "failed";
    await expect(
      reportOutcome(site, deployment, {
        kind: "failed",
        summary: "error",
        diagnostics: [],
      })
    ).resolves.toBeUndefined();
  });

  test("sticky lookup paginates and never edits copied markers from users or another app", async () => {
    const marker = "<!-- notra-preview:site_docs -->";
    comments = Array.from({ length: 100 }, (_, id) => ({
      id,
      body: marker,
      user: { type: id === 0 ? "User" : "Bot" },
      performed_via_github_app: { id: id === 0 ? 123 : 999 },
    }));
    comments.push({
      id: 101,
      body: `${marker}\nold`,
      user: { type: "Bot" },
      performed_via_github_app: { id: 123 },
    });
    const params: PreviewCommentParams = {
      marker,
      pullRequestNumber: 42,
      productionBranch: "main",
      commitSha: deployment.commitSha,
      body: `${marker}\nnew`,
    };
    await upsertPreviewComment(
      requireSiteRepository(site),
      "synthetic",
      params
    );
    expect(comments).toHaveLength(101);
    expect(comments[0]?.body).toBe(marker);
    expect(comments[100]?.body).toBe(params.body);
    expect(
      request.mock.calls.filter(
        ([route]) => route.startsWith("GET ") && route.endsWith("/comments")
      )
    ).toHaveLength(2);
  });

  test.each(["closed", "changed-head", "fork", "changed-base"])(
    "%s PR receives no stale preview update",
    async (reason) => {
      if (reason === "closed") {
        pr.state = "closed";
      }
      if (reason === "changed-head") {
        pr.head.sha = "new-commit";
      }
      if (reason === "fork") {
        pr.head.repo = { id: 999 };
      }
      if (reason === "changed-base") {
        pr.base.ref = "other";
      }
      await openCheckRun(site, deployment);
      expect(comments).toHaveLength(0);
    }
  );
}
