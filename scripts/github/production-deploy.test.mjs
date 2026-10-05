import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { release } from "./production-deploy.mjs";
import { requireReleaseCI } from "./utils/release-ci.mjs";

function fixture({
  dryRun = false,
  changed = () => true,
  override,
  api = false,
  apiStatus = 200,
} = {}) {
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
    ...(api ? { UNKEY_DEPLOY_ROOT_KEY: "test-unkey" } : {}),
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
      } else if (url.hostname === "api.unkey.com") {
        assert.equal(options.headers.Authorization, "Bearer test-unkey");
        switch (url.pathname) {
          case "/v2/domains.listDomains":
            data = [
              {
                domain: "api.usenotra.com",
                status: "verified",
                projectId: "proj_test",
                appId: "app_test",
                environmentId: "env_test",
              },
            ];
            break;
          case "/v2/apps.getApp":
            data = {
              id: "app_test",
              slug: "api",
              git: { repository: "usenotra/notra", defaultBranch: "main" },
              isRolledBack: false,
              currentDeploymentId: "live-api",
            };
            break;
          case "/v2/environments.getEnvironment":
            data = {
              id: "env_test",
              slug: "production",
              kind: "production",
              build: { autoDeploy: false },
            };
            break;
          case "/v2/deployments.listDeployments":
            data = [];
            break;
          case "/v3/deployments.createDeployment":
            data = { deploymentId: "new-api" };
            break;
          case "/v2/deployments.getDeployment":
            data = {
              id: body.deploymentId,
              status: "ready",
              isCurrent: true,
              project: "notra",
              app: "api",
              environment: "production",
              git: {
                commitSha: body.deploymentId === "new-api" ? sha : previousSha,
              },
            };
            break;
          default:
            assert.fail(`Unexpected Unkey endpoint: ${url.pathname}`);
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
    const status =
      typeof apiStatus === "function" ? apiStatus(call) : apiStatus;
    return {
      ok: url.hostname !== "api.unkey.com" || (status >= 200 && status < 300),
      status,
      json: async () => (url.hostname === "api.unkey.com" ? { data } : data),
    };
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
      url.pathname === "/v3/deployments.createDeployment" ||
      body?.query?.includes("serviceInstanceDeployV2")
  );
}

function ciFixture(override) {
  const sha = "a".repeat(40);
  const calls = [];
  const messages = [];
  const sleeps = [];
  const env = {
    GH_TOKEN: "private-test-token",
    GITHUB_SHA: sha,
    GITHUB_REPOSITORY: "usenotra/notra",
    GITHUB_REF: "refs/heads/main",
  };
  const passed = {
    id: 123,
    head_sha: sha,
    status: "completed",
    conclusion: "success",
  };
  return {
    calls,
    messages,
    sleeps,
    env,
    run: () =>
      requireReleaseCI({
        env,
        report: (message) => messages.push(message),
        sleep: async (ms) => sleeps.push(ms),
        fetchImpl: async (input, options) => {
          const url = new URL(input);
          calls.push({ url, options });
          return (
            override?.({ url, passed, reads: calls.length }) ?? {
              ok: true,
              json: async () => ({ workflow_runs: [passed] }),
            }
          );
        },
      }),
  };
}

test("release CI queries both latest main push runs for the pinned SHA", async () => {
  const { run, calls, sleeps, messages, env } = ciFixture();
  await run();
  assert.deepEqual(
    calls.map(({ url }) => url.pathname.split("/").at(-2)),
    ["code-quality.yml", "knip.yml"]
  );
  for (const { url, options } of calls) {
    assert.equal(url.hostname, "api.github.com");
    assert.equal(url.searchParams.get("head_sha"), env.GITHUB_SHA);
    assert.equal(url.searchParams.get("branch"), "main");
    assert.equal(url.searchParams.get("event"), "push");
    assert.equal(url.searchParams.get("per_page"), "1");
    assert.equal(options.headers["Cache-Control"], "no-cache");
  }
  assert.equal(sleeps.length, 0);
  assert.ok(messages.every((message) => message.includes("run 123")));
  assert.ok(messages.every((message) => !message.includes(env.GH_TOKEN)));
});

for (const [name, runs] of [
  ["missing run", () => []],
  [
    "queued run",
    (passed) => [{ ...passed, status: "queued", conclusion: null }],
  ],
  [
    "running rerun",
    (passed) => [{ ...passed, status: "in_progress", conclusion: null }],
  ],
  ["stale SHA", (passed) => [{ ...passed, head_sha: "b".repeat(40) }]],
]) {
  test(`release CI waits for a ${name} and then allows the release`, async () => {
    const { run, calls, sleeps, messages } = ciFixture(({ passed, reads }) =>
      reads === 1
        ? { ok: true, json: async () => ({ workflow_runs: runs(passed) }) }
        : undefined
    );
    await run();
    assert.equal(calls.length, 4);
    assert.deepEqual(sleeps, [30_000]);
    assert.ok(
      messages.some((message) => message.includes("Waiting for release CI"))
    );
  });
}

for (const conclusion of [
  "failure",
  "cancelled",
  "timed_out",
  "skipped",
  "neutral",
  null,
]) {
  test(`release CI fails closed immediately on completed ${conclusion}`, async () => {
    const { run, calls, sleeps } = ciFixture(({ passed }) => ({
      ok: true,
      json: async () => ({ workflow_runs: [{ ...passed, conclusion }] }),
    }));
    await assert.rejects(
      run(),
      /code-quality.yml: run 123.*has not passed.*no builds started/
    );
    assert.equal(calls.length, 1);
    assert.equal(sleeps.length, 0);
  });
}

test("release CI polling is bounded and reports the blocked workflow and SHA", async () => {
  const { run, calls, sleeps, env } = ciFixture(() => ({
    ok: true,
    json: async () => ({ workflow_runs: [] }),
  }));
  await assert.rejects(run(), (error) => {
    assert.match(
      error.message,
      /after 20 checks.*code-quality.yml.*knip.yml.*no builds started/
    );
    assert.ok(error.message.includes(env.GITHUB_SHA));
    return true;
  });
  assert.equal(calls.length, 40);
  assert.equal(sleeps.length, 19);
});

for (const status of [429, 500, 503]) {
  test(`release CI retries transient GitHub HTTP ${status}`, async () => {
    const { run, sleeps, messages } = ciFixture(({ reads }) =>
      reads === 1 ? { ok: false, status } : undefined
    );
    await run();
    assert.deepEqual(sleeps, [30_000]);
    assert.ok(
      messages.some((message) => message.includes(`GitHub HTTP ${status}`))
    );
  });
}

for (const status of [401, 403, 404]) {
  test(`release CI does not retry GitHub HTTP ${status}`, async () => {
    const { run, sleeps } = ciFixture(() => ({ ok: false, status }));
    await assert.rejects(
      run(),
      new RegExp(`HTTP ${status}; no builds started`)
    );
    assert.equal(sleeps.length, 0);
  });
}

test("release CI retries transport failures without logging error contents", async () => {
  const { run, sleeps, messages } = ciFixture(({ reads }) => {
    if (reads === 1) {
      throw new Error("private-test-token");
    }
  });
  await run();
  assert.deepEqual(sleeps, [30_000]);
  assert.ok(
    messages.every((message) => !message.includes("private-test-token"))
  );
});

test("release CI rejects malformed responses without allowing a build", async () => {
  const { run, sleeps } = ciFixture(() => ({
    ok: true,
    json: async () => ({}),
  }));
  await assert.rejects(run(), /invalid GitHub response; no builds started/);
  assert.equal(sleeps.length, 0);
});

for (const update of [
  { GH_TOKEN: "" },
  { GITHUB_SHA: "" },
  { GITHUB_REF: "refs/heads/feature" },
  { GITHUB_REPOSITORY: "other/repo" },
]) {
  test(`release CI rejects invalid environment ${JSON.stringify(update)}`, async () => {
    const { run, env, calls } = ciFixture();
    Object.assign(env, update);
    await assert.rejects(run());
    assert.equal(calls.length, 0);
  });
}

test("release recovers from an initially missing CI run before contacting providers", async () => {
  let reads = 0;
  const { run, calls } = fixture({
    override: ({ url }) => {
      if (url.pathname.includes("/actions/workflows/") && ++reads === 1) {
        return { workflow_runs: [] };
      }
    },
  });
  await run();
  assert.ok(
    calls.slice(0, 4).every(({ url }) => url.hostname === "api.github.com")
  );
  assert.equal(builds(calls).length, 8);
});

test("failed Knip prevents every provider request even after Code Quality passes", async () => {
  const { run, calls } = fixture({
    override: ({ url }) =>
      url.pathname.includes("knip.yml")
        ? {
            workflow_runs: [
              {
                head_sha: "a".repeat(40),
                status: "completed",
                conclusion: "failure",
              },
            ],
          }
        : undefined,
  });
  await assert.rejects(run(), /knip.yml.*has not passed.*no builds started/);
  assert.ok(calls.every(({ url }) => url.hostname === "api.github.com"));
});

test("release CI rechecks a previously passing workflow while another is pending", async () => {
  const { run, calls, sleeps } = ciFixture(({ passed, reads }) => {
    if (reads === 2) {
      return {
        ok: true,
        json: async () => ({ workflow_runs: [] }),
      };
    }
    if (reads === 3) {
      return {
        ok: true,
        json: async () => ({
          workflow_runs: [{ ...passed, conclusion: "failure" }],
        }),
      };
    }
  });
  await assert.rejects(run(), /code-quality.yml.*failure.*no builds started/);
  assert.equal(calls.length, 3);
  assert.deepEqual(sleeps, [30_000]);
});

test("production workflow uses the shared CI gate before builds with a pinned checkout", () => {
  const workflow = readFileSync(
    new URL("../../.github/workflows/production-deploy.yml", import.meta.url),
    "utf8"
  );
  const setup = workflow.indexOf("- name: Setup Node");
  const gate = workflow.indexOf("- name: Require passing release CI");
  const build = workflow.indexOf("- name: Build and boot agents");
  const deploy = workflow.indexOf("- name: Deploy checked main commit");
  assert.ok(setup >= 0 && setup < gate && gate < build && build < deploy);
  assert.ok(workflow.includes("run: node scripts/github/utils/release-ci.mjs"));
  assert.ok(workflow.includes(`ref: \${{ github.sha }}`));
  assert.ok(workflow.includes('cron: "0 12,19 * * *"'));
  assert.ok(workflow.includes("timezone: Europe/Berlin"));
});

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

test("Unkey is opt-in and does not call its API without a deployment key", async () => {
  const { run, calls } = fixture();
  await run();
  assert.ok(calls.every(({ url }) => url.hostname !== "api.unkey.com"));
});

test("Unkey discovers the verified production domain and deploys the pinned commit", async () => {
  const { run, calls, sha, directories } = fixture({ api: true });
  await run();
  const deployment = calls.find(
    ({ url }) => url.pathname === "/v3/deployments.createDeployment"
  );
  assert.deepEqual(deployment.body, {
    project: "proj_test",
    app: "app_test",
    environment: "env_test",
    git: { branch: "main", commitSha: sha },
  });
  assert.equal(directories.length, 10);
  assert.equal(
    directories.filter((directory) => directory === "apps/api").length,
    3
  );
  const apiIndex = calls.indexOf(deployment);
  assert.ok(
    calls.findIndex(({ body }) =>
      body?.query?.includes("serviceInstanceDeployV2")
    ) > apiIndex
  );
});

test("Unkey dry run can inspect auto-deploy configuration without creating builds", async () => {
  const { run, calls } = fixture({
    api: true,
    dryRun: true,
    override: ({ url }) =>
      url.pathname === "/v2/environments.getEnvironment"
        ? {
            id: "env_test",
            slug: "production",
            kind: "production",
            build: { autoDeploy: true },
          }
        : undefined,
  });
  await run();
  assert.equal(builds(calls).length, 0);
});

test("unchanged API skips the Unkey build", async () => {
  const { run, calls } = fixture({
    api: true,
    changed: (app) => app !== "apps/api",
  });
  await run();
  assert.ok(
    calls.every(
      ({ url }) => url.pathname !== "/v3/deployments.createDeployment"
    )
  );
});

for (const [name, path, data] of [
  ["missing domain", "/v2/domains.listDomains", []],
  [
    "unverified domain",
    "/v2/domains.listDomains",
    [{ domain: "api.usenotra.com", status: "pending" }],
  ],
  [
    "wrong repository",
    "/v2/apps.getApp",
    {
      id: "app_test",
      git: { repository: "other/repo", defaultBranch: "main" },
    },
  ],
  [
    "wrong branch",
    "/v2/apps.getApp",
    {
      id: "app_test",
      git: { repository: "usenotra/notra", defaultBranch: "develop" },
    },
  ],
  [
    "rollback",
    "/v2/apps.getApp",
    {
      id: "app_test",
      git: { repository: "usenotra/notra", defaultBranch: "main" },
      isRolledBack: true,
    },
  ],
  [
    "preview environment",
    "/v2/environments.getEnvironment",
    { id: "env_test", kind: "preview" },
  ],
  [
    "automatic production deployment",
    "/v2/environments.getEnvironment",
    { id: "env_test", kind: "production", build: { autoDeploy: true } },
  ],
  [
    "active deployment",
    "/v2/deployments.listDeployments",
    [{ id: "active-api" }],
  ],
  [
    "unidentified live commit",
    "/v2/deployments.getDeployment",
    {
      id: "live-api",
      status: "ready",
      isCurrent: true,
      app: "api",
      environment: "production",
    },
  ],
]) {
  test(`Unkey ${name} prevents all builds`, async () => {
    const { run, calls } = fixture({
      api: true,
      override: ({ url }) => (url.pathname === path ? data : undefined),
    });
    await assert.rejects(run(), /unkey/);
    assert.equal(builds(calls).length, 0);
  });
}

test("Unkey authentication failure prevents all builds without exposing credentials", async () => {
  const { run, calls } = fixture({ api: true, apiStatus: 403 });
  await assert.rejects(run(), {
    message: "unkey v2/domains.listDomains: HTTP 403",
  });
  assert.equal(builds(calls).length, 0);
});

test("diverged Unkey production history prevents all builds", async () => {
  const { run, calls } = fixture({
    api: true,
    override: ({ url }) =>
      url.pathname.includes("/compare/") ? { status: "diverged" } : undefined,
  });
  await assert.rejects(run(), /unkey API: release commit is not ahead/);
  assert.equal(builds(calls).length, 0);
});

test("Unkey creation failure is not retried and prevents Railway builds", async () => {
  const { run, calls } = fixture({
    api: true,
    apiStatus: ({ url }) =>
      url.pathname === "/v3/deployments.createDeployment" ? 500 : 200,
  });
  await assert.rejects(
    run(),
    /unkey v3\/deployments.createDeployment: HTTP 500/
  );
  assert.equal(
    calls.filter(
      ({ url }) => url.pathname === "/v3/deployments.createDeployment"
    ).length,
    1
  );
  assert.ok(
    builds(calls).every(({ url }) => url.hostname !== "backboard.railway.com")
  );
});

for (const [name, path, data] of [
  [
    "active deployment",
    "/v2/deployments.listDeployments",
    [{ id: "manual-api" }],
  ],
  [
    "rollback",
    "/v2/apps.getApp",
    {
      id: "app_test",
      git: { repository: "usenotra/notra", defaultBranch: "main" },
      isRolledBack: true,
    },
  ],
  [
    "auto deploy enabled",
    "/v2/environments.getEnvironment",
    { id: "env_test", kind: "production", build: { autoDeploy: true } },
  ],
  [
    "repository changed",
    "/v2/apps.getApp",
    {
      id: "app_test",
      git: { repository: "other/repo", defaultBranch: "main" },
    },
  ],
]) {
  test(`Unkey intervening ${name} blocks API creation after Vercel`, async () => {
    let reads = 0;
    const { run, calls } = fixture({
      api: true,
      override: ({ url }) => {
        if (url.pathname === path && ++reads === 2) {
          return data;
        }
      },
    });
    await assert.rejects(run(), /unkey/);
    assert.equal(
      calls.filter(({ url }) => url.pathname === "/v13/deployments").length,
      5
    );
    assert.ok(
      builds(calls).every(({ url }) => url.hostname === "api.vercel.com")
    );
  });
}

test("Unkey intervening newer commit cannot be overwritten by the scheduled release", async () => {
  let reads = 0;
  const newer = "c".repeat(40);
  const { run, calls } = fixture({
    api: true,
    override: ({ url, body }) => {
      if (
        url.pathname === "/v2/deployments.getDeployment" &&
        body.deploymentId === "live-api" &&
        ++reads === 2
      ) {
        return {
          id: "live-api",
          status: "ready",
          isCurrent: true,
          app: "api",
          environment: "production",
          git: { commitSha: newer },
        };
      }
      if (url.pathname.includes(`/compare/${newer}`)) {
        return { status: "behind" };
      }
    },
  });
  await assert.rejects(run(), /unkey API: release commit is not ahead/);
  assert.ok(
    builds(calls).every(({ url }) => url.hostname === "api.vercel.com")
  );
});

test("Unkey intervening release of the selected SHA skips duplicate API creation", async () => {
  let reads = 0;
  const { run, calls } = fixture({
    api: true,
    override: ({ url, body }) => {
      if (
        url.pathname === "/v2/deployments.getDeployment" &&
        body.deploymentId === "live-api" &&
        ++reads === 2
      ) {
        return {
          id: "live-api",
          status: "ready",
          isCurrent: true,
          app: "api",
          environment: "production",
          git: { commitSha: "a".repeat(40) },
        };
      }
    },
  });
  await run();
  assert.ok(
    calls.every(
      ({ url }) => url.pathname !== "/v3/deployments.createDeployment"
    )
  );
  assert.ok(
    builds(calls).some(({ url }) => url.hostname === "backboard.railway.com")
  );
});

for (const [name, update] of [
  ["failed", { status: "failed" }],
  ["wrong commit", { git: { commitSha: "c".repeat(40) } }],
  ["wrong target", { app: "other" }],
  ["never current", { isCurrent: false }],
]) {
  test(`Unkey deployment ${name} blocks Railway releases`, async () => {
    const { run, calls } = fixture({
      api: true,
      override: ({ url, body }) =>
        url.pathname === "/v2/deployments.getDeployment" &&
        body.deploymentId === "new-api"
          ? {
              id: "new-api",
              status: "ready",
              isCurrent: true,
              project: "notra",
              app: "api",
              environment: "production",
              git: { commitSha: "a".repeat(40) },
              ...update,
            }
          : undefined,
    });
    await assert.rejects(run(), /unkey/);
    assert.ok(
      builds(calls).every(({ url }) => url.hostname !== "backboard.railway.com")
    );
    assert.equal(
      calls.filter(
        ({ url }) => url.pathname === "/v3/deployments.createDeployment"
      ).length,
      1
    );
  });
}
