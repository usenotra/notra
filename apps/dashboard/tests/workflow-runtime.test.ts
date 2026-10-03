import { expect, test } from "bun:test";
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import { cp, mkdtemp, readFile, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { join } from "node:path";
import { setTimeout } from "node:timers/promises";
import { fileURLToPath } from "node:url";

test("Workflow persists serialized steps and resumes after a server restart", async () => {
  const dashboard = fileURLToPath(new URL("..", import.meta.url));
  const fixture = join(dashboard, "tests/fixtures/workflow-runtime");
  const root = await mkdtemp(join(dashboard, ".workflow-runtime-test-"));
  const listener = createServer();
  listener.listen(0, "127.0.0.1");
  await once(listener, "listening");
  const address = listener.address();
  if (!address || typeof address === "string") {
    throw new Error("Expected a loopback TCP address");
  }
  const port = address.port;
  listener.close();
  await once(listener, "close");
  const baseUrl = `http://127.0.0.1:${port}`;
  const env = {
    PATH: process.env.PATH,
    HOME: process.env.HOME,
    NODE_ENV: "production",
    WORKFLOW_TEST_ROOT: root,
    WORKFLOW_TARGET_WORLD: "local",
    WORKFLOW_LOCAL_DATA_DIR: join(root, ".workflow-data"),
    WORKFLOW_LOCAL_BASE_URL: baseUrl,
    NITRO_HOST: "127.0.0.1",
    PORT: String(port),
    DO_NOT_TRACK: "1",
  } satisfies NodeJS.ProcessEnv;
  let server: ReturnType<typeof spawn> | undefined;
  let output = "";
  const launch = () => {
    server = spawn("node", [join(root, ".output/server/index.mjs")], {
      cwd: root,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    server.stdout?.on("data", (chunk) => {
      output += String(chunk);
    });
    server.stderr?.on("data", (chunk) => {
      output += String(chunk);
    });
  };
  const stop = async () => {
    if (server && server.exitCode === null && server.signalCode === null) {
      const exited = once(server, "exit");
      server.kill("SIGKILL");
      await exited;
    }
  };
  const request = async (query = "") => {
    const response = await fetch(`${baseUrl}/probe${query}`, {
      signal: AbortSignal.timeout(3000),
    });
    expect(response.ok, await response.clone().text()).toBe(true);
    return response.json();
  };
  const waitFor = async (check: () => Promise<boolean>) => {
    const deadline = Date.now() + 30_000;
    while (Date.now() < deadline) {
      if (await check()) {
        return;
      }
      await setTimeout(100);
    }
    throw new Error(`Workflow runtime timed out\n${output}`);
  };
  const ready = () =>
    waitFor(async () => {
      try {
        return (await request()).ready === true;
      } catch {
        return false;
      }
    });
  try {
    await cp(join(fixture, "src"), join(root, "src"), { recursive: true });
    await cp(join(fixture, "index.html"), join(root, "index.html"));
    const build = spawnSync(
      "node",
      [
        join(dashboard, "node_modules/vite/bin/vite.js"),
        "build",
        "--config",
        join(fixture, "vite.config.ts"),
      ],
      { cwd: root, env, encoding: "utf8", timeout: 120_000 }
    );
    expect(build.status, `${build.stdout}\n${build.stderr}`).toBe(0);
    launch();
    await ready();
    const token = crypto.randomUUID();
    const { runId } = await request(`?action=start&token=${token}`);
    expect(runId).toBeString();
    const statusQuery = `?action=status&runId=${runId}`;
    await waitFor(async () => {
      const state = await request(statusQuery);
      return (
        state.hooks === 1 &&
        state.steps.length === 1 &&
        state.steps[0].status === "completed"
      );
    });
    expect(await readFile(join(root, "step-executions.txt"), "utf8")).toBe(
      "prepare\n"
    );
    await stop();
    launch();
    await ready();
    const persisted = await request(statusQuery);
    expect(persisted.hooks).toBe(1);
    expect(persisted.steps).toEqual([{ status: "completed" }]);
    expect(persisted.status).not.toBe("completed");
    expect(await request(`?action=resume&token=${token}`)).toEqual({ runId });
    await waitFor(
      async () => (await request(statusQuery)).status === "completed"
    );
    const completed = await request(statusQuery);
    expect(completed.steps).toEqual([
      { status: "completed" },
      { status: "completed" },
    ]);
    expect(completed.result).toEqual({
      approved: "approved",
      createdAt: "2026-10-02T00:00:00.000Z",
      restoredMap: true,
      restoredDate: true,
    });
    expect(await readFile(join(root, "step-executions.txt"), "utf8")).toBe(
      "prepare\nfinish\n"
    );
  } finally {
    await stop();
    await rm(root, { recursive: true, force: true });
  }
}, 180_000);
