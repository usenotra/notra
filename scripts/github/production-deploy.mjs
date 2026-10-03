import { execFileSync } from "node:child_process";
import { appendFile } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";
import { pathToFileURL } from "node:url";

const projects = [
  {
    name: "notra",
    directory: "apps/dashboard",
    productionAlias: "notra-notra.vercel.app",
  },
  {
    name: "notra-web",
    directory: "apps/web",
    productionAlias: "notra-web-notra.vercel.app",
  },
  {
    name: "notra-ui",
    directory: "apps/ui",
    productionAlias: "notra-ui-notra.vercel.app",
  },
];
// Railway services follow the Vercel release instead of auto-deploying every
// push to main, so the demo and the ingest never run ahead of production.
const railwayServices = [
  {
    name: "demo-dashboard",
    directory: "apps/dashboard",
    projectId: "48abcb3c-19e1-4c81-a7d3-e2c697c86832",
    environmentId: "2c9756ae-90db-4606-b420-470fd23151a3",
    serviceId: "9cb261a4-7d94-446f-8523-84a4b75cbb3d",
  },
  {
    name: "demo-api",
    directory: "apps/api",
    projectId: "48abcb3c-19e1-4c81-a7d3-e2c697c86832",
    environmentId: "2c9756ae-90db-4606-b420-470fd23151a3",
    serviceId: "17ba5ec0-ec2e-412d-aa2c-61b23f37b40a",
  },
  {
    name: "ai-traffic-ingest",
    directory: "apps/ai-traffic-ingest",
    projectId: "557ca18d-9de8-40ad-9fca-cf3d165f3c44",
    environmentId: "276f8b24-ccd7-4bf3-a6b6-1dbe9f7fe5c6",
    serviceId: "2d259982-cccc-488d-b2ba-77b12fd3e854",
  },
];
const railwayActiveStates = [
  "WAITING",
  "QUEUED",
  "INITIALIZING",
  "BUILDING",
  "DEPLOYING",
];
const railwayLiveStates = ["SUCCESS", "SLEEPING"];
const requiredWorkflows = ["code-quality.yml", "knip.yml"];
const activeStates = new Set(["QUEUED", "INITIALIZING", "BUILDING"]);

function deploymentSha(deployment) {
  return deployment?.gitSource?.sha ?? deployment?.meta?.githubCommitSha;
}

// Shared packages and root inputs conservatively affect every application.
export function hasBuildChanges(directory, previousSha, sha) {
  if (!previousSha) {
    return true;
  }
  if (previousSha === sha) {
    return false;
  }
  try {
    const files = execFileSync(
      "git",
      ["diff", "--no-renames", "--name-only", "-z", previousSha, sha, "--"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
    ).split("\0");
    return files.some(
      (file) =>
        file.startsWith(`${directory}/`) ||
        file.startsWith("packages/") ||
        (file && !file.startsWith("apps/"))
    );
  } catch {
    // A deleted or unavailable historical commit cannot prove a build is safe to skip.
    return true;
  }
}

export async function release({
  env = process.env,
  fetchImpl = fetch,
  buildChanged = hasBuildChanges,
  sleep = delay,
} = {}) {
  for (const key of [
    "GH_TOKEN",
    "VERCEL_TOKEN",
    "VERCEL_TEAM_ID",
    "RAILWAY_TOKEN",
    "GITHUB_SHA",
    "GITHUB_REPOSITORY_ID",
  ]) {
    if (!env[key]) {
      throw new Error(`${key} is required`);
    }
  }
  if (
    env.GITHUB_REF !== "refs/heads/main" ||
    env.GITHUB_REPOSITORY !== "usenotra/notra"
  ) {
    throw new Error("Production releases must run from usenotra/notra main");
  }
  const sha = env.GITHUB_SHA;
  const repositoryId = Number(env.GITHUB_REPOSITORY_ID);
  if (!Number.isSafeInteger(repositoryId) || repositoryId <= 0) {
    throw new Error("GITHUB_REPOSITORY_ID must be a positive safe integer");
  }
  const report = async (message) => {
    console.log(message);
    if (env.GITHUB_STEP_SUMMARY) {
      await appendFile(env.GITHUB_STEP_SUMMARY, `${message}\n\n`);
    }
  };
  const request = async (provider, path, body) => {
    const github = provider === "github";
    const url = new URL(
      path,
      github ? "https://api.github.com" : "https://api.vercel.com"
    );
    if (!github) {
      url.searchParams.set("teamId", env.VERCEL_TEAM_ID);
    }
    const response = await fetchImpl(url, {
      method: body ? "POST" : "GET",
      headers: {
        Authorization: `Bearer ${github ? env.GH_TOKEN : env.VERCEL_TOKEN}`,
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(github ? { "X-GitHub-Api-Version": "2022-11-28" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) {
      // Do not log response bodies or retry deployment creation: a timed-out
      // POST might already have started a billable build.
      throw new Error(`${provider} ${url.pathname}: HTTP ${response.status}`);
    }
    return response.json();
  };
  const railway = async (query, variables) => {
    const response = await fetchImpl(
      "https://backboard.railway.com/graphql/v2",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.RAILWAY_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query, variables }),
        signal: AbortSignal.timeout(30_000),
      }
    );
    if (!response.ok) {
      throw new Error(`railway: HTTP ${response.status}`);
    }
    const result = await response.json();
    if (result.errors?.length) {
      throw new Error(
        `railway: ${result.errors.map((error) => error.message).join(", ")}`
      );
    }
    return result.data;
  };
  const latestRailwayDeployment = async (service, states) => {
    const data = await railway(
      `query ($input: DeploymentListInput!) {
        deployments(input: $input, first: 1) {
          edges { node { id status meta } }
        }
      }`,
      {
        input: {
          projectId: service.projectId,
          environmentId: service.environmentId,
          serviceId: service.serviceId,
          status: { in: states },
        },
      }
    );
    return data.deployments.edges[0]?.node;
  };
  const assertAheadOf = async (name, previousSha) => {
    if (previousSha === sha) {
      return;
    }
    const comparison = await request(
      "github",
      `/repos/${env.GITHUB_REPOSITORY}/compare/${previousSha}...${sha}`
    );
    if (comparison.status !== "ahead") {
      throw new Error(
        `${name}: release commit is not ahead of production (${comparison.status}); no builds started`
      );
    }
  };

  // Require the latest push run for this exact SHA, including any rerun.
  for (const workflow of requiredWorkflows) {
    const result = await request(
      "github",
      `/repos/${env.GITHUB_REPOSITORY}/actions/workflows/${workflow}/runs?head_sha=${sha}&branch=main&event=push&per_page=1`
    );
    const run = result.workflow_runs[0];
    if (
      run?.head_sha !== sha ||
      run.status !== "completed" ||
      run.conclusion !== "success"
    ) {
      throw new Error(
        `${workflow} has not passed for ${sha}; no builds started`
      );
    }
  }
  await report(`Release commit: \`${sha}\``);

  const plans = [];
  for (const project of projects) {
    const active = await request(
      "vercel",
      `/v6/deployments?projectId=${project.name}&target=production&limit=1&state=QUEUED,INITIALIZING,BUILDING`
    );
    if (active.deployments.length > 0) {
      throw new Error(`${project.name} already has an active production build`);
    }
    const latest = await request("vercel", `/v9/projects/${project.name}`);
    if (latest.link?.productionBranch !== "main") {
      throw new Error(`${project.name} production branch must remain main`);
    }
    const alias = await request(
      "vercel",
      `/v4/aliases/${project.productionAlias}`
    );
    if (alias.projectId !== latest.id || !alias.deploymentId) {
      throw new Error(
        `${project.name}: production alias must identify this project's live deployment; no builds started`
      );
    }
    const production = await request(
      "vercel",
      `/v13/deployments/${alias.deploymentId}`
    );
    const previousSha = deploymentSha(production);
    if (production.readyState !== "READY" || !previousSha) {
      throw new Error(
        `${project.name}: cannot identify the current production commit; no builds started`
      );
    }
    await assertAheadOf(project.name, previousSha);
    const changed = buildChanged(project.directory, previousSha, sha);
    plans.push({ ...project, changed });
  }

  const railwayPlans = [];
  for (const service of railwayServices) {
    if (await latestRailwayDeployment(service, railwayActiveStates)) {
      throw new Error(
        `${service.name} already has an active Railway deployment`
      );
    }
    const live = await latestRailwayDeployment(service, railwayLiveStates);
    const previousSha = live?.meta?.commitHash;
    if (!previousSha) {
      throw new Error(
        `${service.name}: cannot identify the current Railway commit; no builds started`
      );
    }
    await assertAheadOf(service.name, previousSha);
    const changed = buildChanged(service.directory, previousSha, sha);
    railwayPlans.push({ ...service, changed });
  }

  const failures = [];
  for (const project of plans) {
    if (!project.changed) {
      await report(
        `${project.name}: skipped, no build changes since production`
      );
      continue;
    }
    if (env.DRY_RUN === "true") {
      await report(`${project.name}: would deploy ${sha}`);
      continue;
    }
    try {
      const deployment = await request("vercel", "/v13/deployments", {
        name: project.name,
        project: project.name,
        target: "production",
        gitSource: {
          type: "github",
          repoId: repositoryId,
          ref: "main",
          sha,
        },
      });
      if (!deployment.id) {
        throw new Error(`${project.name}: deployment creation returned no ID`);
      }
      await report(`${project.name}: started https://${deployment.url}`);
      let completed = false;
      const deadline = Date.now() + 10 * 60_000;
      for (
        let attempt = 0;
        attempt < 60 && Date.now() < deadline;
        attempt += 1
      ) {
        const status = await request(
          "vercel",
          `/v13/deployments/${deployment.id}`
        );
        if (status.readyState === "READY") {
          if (deploymentSha(status) !== sha) {
            throw new Error(`${project.name}: built a different commit`);
          }
          let alias;
          try {
            alias = await request(
              "vercel",
              `/v4/aliases/${project.productionAlias}`
            );
          } catch (error) {
            await report(
              `${project.name}: waiting for production alias (${error.message})`
            );
          }
          if (alias?.deploymentId === deployment.id) {
            await report(`${project.name}: READY https://${status.url}`);
            completed = true;
            break;
          }
        } else if (!activeStates.has(status.readyState)) {
          throw new Error(
            `${project.name}: deployment ended ${status.readyState}`
          );
        }
        const remaining = deadline - Date.now();
        if (remaining > 0) {
          await sleep(Math.min(10_000, remaining));
        }
      }
      if (!completed) {
        throw new Error(
          `${project.name}: deployment did not finish in 10 minutes`
        );
      }
    } catch (error) {
      failures.push(error.message);
      await report(error.message);
    }
  }
  if (failures.length > 0) {
    // Keep Railway on the previous commit while production did not move.
    await report("Railway: skipped, a Vercel production deployment failed");
    throw new Error(failures.join("\n"));
  }

  const started = [];
  for (const service of railwayPlans) {
    if (!service.changed) {
      await report(
        `${service.name}: skipped, no build changes since production`
      );
      continue;
    }
    if (env.DRY_RUN === "true") {
      await report(`${service.name}: would deploy ${sha}`);
      continue;
    }
    try {
      const data = await railway(
        `mutation ($serviceId: String!, $environmentId: String!, $commitSha: String!) {
          serviceInstanceDeployV2(serviceId: $serviceId, environmentId: $environmentId, commitSha: $commitSha)
        }`,
        {
          serviceId: service.serviceId,
          environmentId: service.environmentId,
          commitSha: sha,
        }
      );
      const deploymentId = data.serviceInstanceDeployV2;
      if (!deploymentId) {
        throw new Error(`${service.name}: deployment creation returned no ID`);
      }
      await report(
        `${service.name}: started Railway deployment ${deploymentId}`
      );
      started.push({ ...service, deploymentId });
    } catch (error) {
      failures.push(error.message);
      await report(error.message);
    }
  }

  // Railway builds run in parallel; Docker builds take longer than Vercel's.
  const deadline = Date.now() + 20 * 60_000;
  let pending = started;
  while (pending.length > 0) {
    const stillPending = [];
    for (const service of pending) {
      try {
        const { deployment } = await railway(
          `query ($id: String!) { deployment(id: $id) { status meta } }`,
          { id: service.deploymentId }
        );
        if (railwayLiveStates.includes(deployment.status)) {
          if (deployment.meta?.commitHash !== sha) {
            throw new Error(`${service.name}: built a different commit`);
          }
          await report(`${service.name}: ${deployment.status}`);
        } else if (deployment.status === "SKIPPED") {
          // The service's watch patterns ignored every changed file.
          await report(`${service.name}: skipped by Railway watch patterns`);
        } else if (!railwayActiveStates.includes(deployment.status)) {
          throw new Error(
            `${service.name}: deployment ended ${deployment.status}`
          );
        } else if (Date.now() >= deadline) {
          throw new Error(
            `${service.name}: deployment did not finish in 20 minutes`
          );
        } else {
          stillPending.push(service);
        }
      } catch (error) {
        failures.push(error.message);
        await report(error.message);
      }
    }
    pending = stillPending;
    if (pending.length > 0) {
      await sleep(Math.min(15_000, Math.max(0, deadline - Date.now())));
    }
  }
  if (failures.length > 0) {
    throw new Error(failures.join("\n"));
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await release();
}
