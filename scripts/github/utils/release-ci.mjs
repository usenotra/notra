import { setTimeout as delay } from "node:timers/promises";
import { pathToFileURL } from "node:url";

export async function requireReleaseCI({
  env = process.env,
  fetchImpl = fetch,
  sleep = delay,
  report = console.log,
} = {}) {
  if (!env.GH_TOKEN || !env.GITHUB_SHA) {
    throw new Error("GH_TOKEN and GITHUB_SHA are required");
  }
  if (
    env.GITHUB_REF !== "refs/heads/main" ||
    env.GITHUB_REPOSITORY !== "usenotra/notra"
  ) {
    throw new Error("Production releases must run from usenotra/notra main");
  }

  let pending;
  for (let attempt = 1; attempt <= 20; attempt += 1) {
    pending = [];
    for (const workflow of ["code-quality.yml", "knip.yml"]) {
      const url = new URL(
        `https://api.github.com/repos/${env.GITHUB_REPOSITORY}/actions/workflows/${workflow}/runs`
      );
      url.search = new URLSearchParams({
        head_sha: env.GITHUB_SHA,
        branch: "main",
        event: "push",
        per_page: "1",
      }).toString();
      let response;
      try {
        response = await fetchImpl(url, {
          headers: {
            Authorization: `Bearer ${env.GH_TOKEN}`,
            Accept: "application/json",
            "X-GitHub-Api-Version": "2022-11-28",
            "Cache-Control": "no-cache",
          },
          signal: AbortSignal.timeout(30_000),
        });
      } catch {
        pending.push(`${workflow}: GitHub request failed`);
        continue;
      }
      if (!response.ok) {
        if (response.status !== 429 && response.status < 500) {
          throw new Error(
            `${workflow}: GitHub HTTP ${response.status}; no builds started`
          );
        }
        pending.push(`${workflow}: GitHub HTTP ${response.status}`);
        continue;
      }
      const result = await response.json();
      if (!Array.isArray(result.workflow_runs)) {
        throw new Error(
          `${workflow}: invalid GitHub response; no builds started`
        );
      }
      const run = result.workflow_runs[0];
      const state = run
        ? `${workflow}: run ${run.id ?? "unknown"}, sha ${run.head_sha}, ${run.status}/${run.conclusion ?? "pending"}`
        : `${workflow}: no push run found for ${env.GITHUB_SHA}`;
      await report(`CI check ${attempt}/20: ${state}`);
      if (run?.head_sha !== env.GITHUB_SHA || run.status !== "completed") {
        pending.push(state);
      } else if (run.conclusion !== "success") {
        throw new Error(`${state}; has not passed; no builds started`);
      }
    }
    if (pending.length === 0) {
      return;
    }
    await report(`Waiting for release CI: ${pending.join("; ")}`);
    if (attempt < 20) {
      await sleep(30_000);
    }
  }
  throw new Error(
    `Release CI has not passed for ${env.GITHUB_SHA} after 20 checks: ${pending.join("; ")}; no builds started`
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await requireReleaseCI();
}
