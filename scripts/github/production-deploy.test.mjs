import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { hasBuildChanges, release } from "./production-deploy.mjs";

const sha = "a".repeat(40);
const previousSha = "b".repeat(40);
const env = {
  GH_TOKEN: "github-test-token",
  VERCEL_TOKEN: "vercel-test-token",
  VERCEL_TEAM_ID: "team_test",
  GITHUB_SHA: sha,
  GITHUB_REPOSITORY: "usenotra/notra",
  GITHUB_REPOSITORY_ID: "123",
  GITHUB_REF: "refs/heads/main",
};

function api({
  conclusion = "success",
  comparisonStatus = "ahead",
  deployedSha = previousSha,
  promotedSha = deployedSha,
  active = false,
  finalState = "READY",
  builtSha = sha,
  createStatus = 200,
} = {}) {
  const posts = [];
  const calls = [];
  return {
    posts,
    calls,
    buildChanged: (_directory, baseline, target) => baseline !== target,
    async fetchImpl(url, options) {
      calls.push(url);
      assert.equal(
        options.headers.Authorization,
        `Bearer ${url.hostname === "api.github.com" ? env.GH_TOKEN : env.VERCEL_TOKEN}`
      );
      if (url.hostname === "api.github.com") {
        if (url.pathname.includes("/compare/")) {
          assert.equal(
            url.pathname,
            `/repos/usenotra/notra/compare/${promotedSha}...${sha}`
          );
          return Response.json({ status: comparisonStatus });
        }
        assert.equal(url.searchParams.get("head_sha"), sha);
        return Response.json({
          workflow_runs: [{ head_sha: sha, status: "completed", conclusion }],
        });
      }
      assert.equal(url.searchParams.get("teamId"), env.VERCEL_TEAM_ID);
      if (url.pathname === "/v6/deployments") {
        if (url.searchParams.get("state") === "READY") {
          return Response.json({
            deployments: [{ meta: { githubCommitSha: deployedSha } }],
          });
        }
        return Response.json({
          deployments: active ? [{ state: "BUILDING" }] : [],
        });
      }
      if (url.pathname.startsWith("/v9/projects/")) {
        return Response.json({
          link: { productionBranch: "main" },
          targets: { production: { meta: { githubCommitSha: promotedSha } } },
        });
      }
      if (options.method === "POST") {
        posts.push(JSON.parse(options.body));
        return Response.json(
          { id: `dpl_${posts.length}`, url: "example.vercel.app" },
          { status: createStatus }
        );
      }
      assert.match(url.pathname, /^\/v13\/deployments\/dpl_/);
      return Response.json({
        readyState: finalState,
        meta: { githubCommitSha: builtSha },
        url: "example.vercel.app",
      });
    },
  };
}

test("all Vercel apps disable automatic Git deployments, including previews", () => {
  for (const app of ["dashboard", "web", "ui", "agent", "onboarding-agent"]) {
    const config = JSON.parse(readFileSync(`apps/${app}/vercel.json`, "utf8"));
    assert.equal(config.git.deploymentEnabled, false, app);
  }
});

test("failed, pending, or missing CI never starts a build", async () => {
  for (const conclusion of ["failure", "cancelled", null]) {
    const mock = api({ conclusion });
    await assert.rejects(release({ env, ...mock }), /has not passed/);
    assert.equal(mock.posts.length, 0);
  }
  await assert.rejects(
    release({ env, fetchImpl: () => Response.json({ workflow_runs: [] }) }),
    /has not passed/
  );
});

test("unchanged projects are skipped using their own successful deployment", async () => {
  const mock = api({ deployedSha: sha });
  await release({ env, ...mock });
  assert.equal(mock.posts.length, 0);
});

test("change checks compare with the currently promoted target after a rollback", async () => {
  const mock = api({ deployedSha: sha, promotedSha: previousSha });
  await release({ env, ...mock });
  assert.equal(mock.posts.length, 3);
  const current = api({ deployedSha: previousSha, promotedSha: sha });
  await release({ env, ...current });
  assert.equal(current.posts.length, 0);
});

test("old workflow reruns cannot overwrite a newer production commit", async () => {
  const mock = api({ comparisonStatus: "behind" });
  await assert.rejects(
    release({ env, ...mock }),
    /not ahead of production \(behind\)/
  );
  assert.equal(mock.posts.length, 0);
});

test("diverged or unverifiable production history prevents all builds", async () => {
  for (const comparisonStatus of ["diverged", undefined]) {
    const mock = api();
    const fetchImpl = (url, options) => {
      if (url.pathname.includes("/compare/")) {
        return Response.json({ status: comparisonStatus });
      }
      return mock.fetchImpl(url, options);
    };
    await assert.rejects(
      release({ env, ...mock, fetchImpl }),
      /not ahead of production/
    );
    assert.equal(mock.posts.length, 0);
  }
});

test("a newer production commit in any project blocks the entire release", async () => {
  const mock = api();
  let comparisons = 0;
  const fetchImpl = (url, options) => {
    if (url.pathname.includes("/compare/")) {
      comparisons += 1;
      return Response.json({ status: comparisons === 2 ? "behind" : "ahead" });
    }
    return mock.fetchImpl(url, options);
  };
  await assert.rejects(
    release({ env, ...mock, fetchImpl }),
    /notra-web: release commit is not ahead/
  );
  assert.equal(comparisons, 2);
  assert.equal(mock.posts.length, 0);
});

test("dry runs validate the release without issuing POST requests", async () => {
  const mock = api();
  await release({ env: { ...env, DRY_RUN: "true" }, ...mock });
  assert.equal(mock.posts.length, 0);
  assert.equal(
    mock.calls.filter((url) => url.pathname.includes("/actions/workflows/"))
      .length,
    2
  );
});

test("a release pins every project to the same checked SHA and production target", async () => {
  const mock = api();
  await release({ env, ...mock });
  assert.deepEqual(
    mock.posts.map((body) => body.project),
    ["notra", "notra-web", "notra-ui"]
  );
  for (const body of mock.posts) {
    assert.equal(body.target, "production");
    assert.deepEqual(body.gitSource, {
      type: "github",
      repoId: "123",
      ref: "main",
      sha,
    });
  }
});

test("a running build blocks the whole release before any new build starts", async () => {
  const mock = api({ active: true });
  await assert.rejects(release({ env, ...mock }), /already has an active/);
  assert.equal(mock.posts.length, 0);
});

test("failed builds and wrong commit results fail the action", async () => {
  for (const options of [{ finalState: "ERROR" }, { builtSha: previousSha }]) {
    const mock = api(options);
    await assert.rejects(
      release({ env, ...mock }),
      /ended ERROR|different commit/
    );
    assert.equal(mock.posts.length, 3);
  }
});

test("an unsuccessful create request is never retried", async () => {
  const mock = api({ createStatus: 500 });
  await assert.rejects(release({ env, ...mock }), /HTTP 500/);
  assert.equal(mock.posts.length, 3);
  assert.equal(new Set(mock.posts.map((body) => body.project)).size, 3);
});

test("a build timeout fails the action instead of reporting success", async () => {
  const mock = api({ finalState: "BUILDING" });
  await assert.rejects(
    release({ env, ...mock, sleep: async () => {} }),
    /did not finish in 10 minutes/
  );
  assert.equal(mock.posts.length, 3);
});

test("manual releases cannot deploy a feature branch or a fork", async () => {
  for (const override of [
    { GITHUB_REF: "refs/heads/feature" },
    { GITHUB_REPOSITORY: "someone/notra" },
    { VERCEL_TOKEN: "" },
  ]) {
    const mock = api();
    await assert.rejects(release({ env: { ...env, ...override }, ...mock }));
    assert.equal(mock.calls.length, 0);
  }
});

test("real Git diffs skip other apps and include shared and deleted inputs", () => {
  const directory = mkdtempSync(join(tmpdir(), "notra-release-"));
  const originalDirectory = process.cwd();
  const git = (...args) =>
    execFileSync("git", args, { cwd: directory, encoding: "utf8" }).trim();
  try {
    git("init", "--quiet");
    git("config", "user.name", "Release test");
    git("config", "user.email", "release@example.com");
    for (const folder of ["apps/web", "apps/dashboard", "packages/ui"]) {
      mkdirSync(join(directory, folder), { recursive: true });
      writeFileSync(join(directory, folder, "input.txt"), "before");
    }
    git("add", ".");
    git("commit", "--quiet", "-m", "initial");
    const before = git("rev-parse", "HEAD");
    process.chdir(directory);
    writeFileSync(join(directory, "apps/web/input.txt"), "after");
    git("add", ".");
    git("commit", "--quiet", "-m", "change web");
    const web = git("rev-parse", "HEAD");
    assert.equal(hasBuildChanges("apps/dashboard", before, web), false);
    assert.equal(hasBuildChanges("apps/web", before, web), true);
    git("mv", "apps/dashboard/input.txt", "apps/web/moved.txt");
    git("commit", "--quiet", "-m", "move input between apps");
    const moved = git("rev-parse", "HEAD");
    assert.match(git("diff", "--name-status", web, moved), /^R100/);
    assert.equal(hasBuildChanges("apps/dashboard", web, moved), true);
    assert.equal(hasBuildChanges("apps/web", web, moved), true);
    git("mv", "apps/web/moved.txt", "apps/dashboard/input.txt");
    git("commit", "--quiet", "-m", "restore input");
    const restored = git("rev-parse", "HEAD");
    writeFileSync(join(directory, "packages/ui/input.txt"), "after");
    git("add", ".");
    git("commit", "--quiet", "-m", "change shared package");
    const shared = git("rev-parse", "HEAD");
    assert.equal(hasBuildChanges("apps/dashboard", restored, shared), true);
    assert.equal(hasBuildChanges("apps/web", restored, shared), true);
    git("rm", "--quiet", "apps/dashboard/input.txt");
    git("commit", "--quiet", "-m", "delete dashboard input");
    const after = git("rev-parse", "HEAD");
    assert.equal(hasBuildChanges("apps/dashboard", shared, after), true);
    assert.equal(hasBuildChanges("apps/web", shared, after), false);
    assert.equal(hasBuildChanges("apps/dashboard", before, after), true);
    assert.equal(hasBuildChanges("apps/dashboard", after, after), false);
    assert.equal(hasBuildChanges("apps/dashboard", null, after), true);
    assert.equal(
      hasBuildChanges("apps/dashboard", "missing-commit", after),
      true
    );
  } finally {
    process.chdir(originalDirectory);
    rmSync(directory, { recursive: true, force: true });
  }
});
