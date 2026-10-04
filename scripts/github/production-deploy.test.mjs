import assert from "node:assert/strict";
import { test } from "node:test";

import { release } from "./production-deploy.mjs";

function fixture({ dryRun = false, changed = () => true, override } = {}) {
  const sha = "a".repeat(40);
  const previousSha = "b".repeat(40);
  const calls = [];
  const directories = [];
  const published = new Map();
  const env = {
    GH_TOKEN: "test",
    VERCEL_TOKEN: "test",
    VERCEL_TEAM_ID: "test-team",
    RAILWAY_TOKEN: "test",
    GITHUB_SHA: sha,
    GITHUB_REPOSITORY_ID: "123",
    GITHUB_REPOSITORY: "usenotra/notra",
    GITHUB_REF: "refs/heads/main",
    DRY_RUN: String(dryRun),
  };
  const fetchImpl = async (input, options) => {
    const url = new URL(input);
    const body = options.body ? JSON.parse(options.body) : undefined;
    const call = { url, body, method: options.method };
    calls.push(call);
    let data = override?.(call);
    if (data === undefined) {
      if (url.hostname === "api.github.com") {
        data = url.pathname.includes("/compare/")
          ? { status: "ahead" }
          : {
              workflow_runs: [
                { head_sha: sha, status: "completed", conclusion: "success" },
              ],
            };
      } else if (url.hostname === "api.vercel.com") {
        assert.equal(url.searchParams.get("teamId"), env.VERCEL_TEAM_ID);
        if (url.pathname === "/v6/deployments") {
          data = { deployments: [] };
        } else if (url.pathname.startsWith("/v9/projects/")) {
          data = {
            id: url.pathname.split("/").at(-1),
            link: { productionBranch: "main" },
          };
        } else if (url.pathname.startsWith("/v4/aliases/")) {
          const project = url.pathname
            .split("/")
            .at(-1)
            .replace("-notra.vercel.app", "");
          data = {
            projectId: project,
            deploymentId: published.get(project) ?? `live-${project}`,
          };
        } else if (url.pathname === "/v13/deployments") {
          const id = `new-${body.project}`;
          published.set(body.project, id);
          data = { id, url: `${body.project}.vercel.app` };
        } else {
          data = {
            readyState: "READY",
            gitSource: {
              sha: url.pathname.includes("/new-") ? sha : previousSha,
            },
            url: "production.vercel.app",
          };
        }
      } else {
        assert.equal(url.hostname, "backboard.railway.com");
        if (body.query.includes("serviceInstanceDeployV2")) {
          data = { serviceInstanceDeployV2: `new-${body.variables.serviceId}` };
        } else if (body.query.includes("deployment(id:")) {
          data = {
            deployment: { status: "SUCCESS", meta: { commitHash: sha } },
          };
        } else {
          data = {
            deployments: {
              edges: body.variables.input.status.in.includes("SUCCESS")
                ? [{ node: { id: "live", meta: { commitHash: previousSha } } }]
                : [],
            },
          };
        }
        data = { data };
      }
    }
    return { ok: true, json: async () => data };
  };
  return {
    sha,
    calls,
    directories,
    run: () =>
      release({
        env,
        fetchImpl,
        sleep: async () => {},
        buildChanged: (directory, previous, current) => {
          assert.equal(previous, previousSha);
          assert.equal(current, sha);
          directories.push(directory);
          return changed(directory);
        },
      }),
  };
}

function builds(calls) {
  return calls.filter(
    ({ url, body }) =>
      url.pathname === "/v13/deployments" ||
      body?.query?.includes("serviceInstanceDeployV2")
  );
}

test("all five Vercel projects and three Railway services deploy the pinned SHA", async () => {
  const { run, calls, sha, directories } = fixture();
  await run();
  const started = builds(calls);
  assert.equal(started.length, 8);
  assert.deepEqual(
    started
      .filter(({ url }) => url.hostname === "api.vercel.com")
      .map(({ body }) => body.project),
    ["notra", "notra-web", "notra-ui", "notra-agent", "notra-onboarding-agent"]
  );
  for (const { url, body } of started) {
    if (url.hostname === "api.vercel.com") {
      assert.deepEqual(body.gitSource, {
        type: "github",
        repoId: 123,
        ref: "main",
        sha,
      });
      assert.equal(body.target, "production");
    } else {
      assert.equal(body.variables.commitSha, sha);
    }
  }
  assert.ok(directories.includes("apps/agent"));
  assert.ok(directories.includes("apps/onboarding-agent"));
});

test("dry run validates every target without creating any builds", async () => {
  const { run, calls, directories } = fixture({ dryRun: true });
  await run();
  assert.equal(builds(calls).length, 0);
  assert.equal(directories.length, 8);
});

for (const directory of ["apps/agent", "apps/onboarding-agent"]) {
  test(`${directory} changes deploy only its own project`, async () => {
    const { run, calls } = fixture({ changed: (app) => app === directory });
    await run();
    const started = builds(calls);
    assert.equal(started.length, 1);
    assert.equal(started[0].body.project, `notra-${directory.split("/")[1]}`);
  });
}

for (const project of ["notra-agent", "notra-onboarding-agent"]) {
  for (const guard of ["active", "alias", "commit", "branch"]) {
    test(`${project} fails closed on ${guard} before any builds`, async () => {
      const { run, calls } = fixture({
        override: ({ url }) => {
          if (
            guard === "active" &&
            url.searchParams.get("projectId") === project
          ) {
            return { deployments: [{ id: "active" }] };
          }
          if (
            guard === "alias" &&
            url.pathname === `/v4/aliases/${project}-notra.vercel.app`
          ) {
            return { projectId: "wrong-project", deploymentId: "live" };
          }
          if (
            guard === "commit" &&
            url.pathname === `/v13/deployments/live-${project}`
          ) {
            return { readyState: "READY" };
          }
          if (
            guard === "branch" &&
            url.pathname === `/v9/projects/${project}`
          ) {
            return { id: project, link: { productionBranch: "other" } };
          }
        },
      });
      await assert.rejects(run(), new RegExp(project));
      assert.equal(builds(calls).length, 0);
    });
  }
}

test("diverged production history prevents every build", async () => {
  const { run, calls } = fixture({
    override: ({ url }) =>
      url.pathname.includes("/compare/") ? { status: "diverged" } : undefined,
  });
  await assert.rejects(run(), /not ahead of production/);
  assert.equal(builds(calls).length, 0);
});

test("failed CI prevents all provider requests", async () => {
  const { run, calls } = fixture({
    override: ({ url }) =>
      url.hostname === "api.github.com" ? { workflow_runs: [] } : undefined,
  });
  await assert.rejects(run(), /has not passed/);
  assert.ok(calls.every(({ url }) => url.hostname === "api.github.com"));
});

test("failed agent deployment prevents Railway builds", async () => {
  const { run, calls } = fixture({
    override: ({ url }) =>
      url.pathname === "/v13/deployments/new-notra-agent"
        ? { readyState: "ERROR" }
        : undefined,
  });
  await assert.rejects(run(), /notra-agent: deployment ended ERROR/);
  assert.ok(
    builds(calls).every(({ url }) => url.hostname === "api.vercel.com")
  );
});
