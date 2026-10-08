/// <reference lib="es2024.promise" />
import { afterAll, beforeEach, expect, mock, test } from "bun:test";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, unlinkSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { WORKFLOW_OPTIMIZATION_BASELINE_SHA } from "../../../tests/constants/workflow-optimizations";

if (process.env.NOTRA_POSTHOG_FLUSH_WORKER !== "1") {
  test("isolated PostHog flush barriers", () => {
    const result = spawnSync(
      process.execPath,
      ["test", fileURLToPath(import.meta.url)],
      {
        env: {
          PATH: process.env.PATH,
          HOME: process.env.HOME,
          TMPDIR: process.env.TMPDIR,
          NODE_ENV: "test",
          NOTRA_POSTHOG_FLUSH_WORKER: "1",
        },
        timeout: 25_000,
      }
    );
    expect(result.status, result.stderr.toString()).toBe(0);
  }, 30_000);
} else {
  globalThis.fetch = mock(() => {
    throw new Error("External network is forbidden");
  });
  process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN = "synthetic-token";
  const flushes: ReturnType<typeof Promise.withResolvers<void>>[] = [];
  let captures = 0;
  let shutdowns = 0;
  mock.module("posthog-node", () => ({
    PostHog: class {
      capture() {
        captures += 1;
      }
      captureException() {
        captures += 1;
      }
      identify() {
        captures += 1;
      }
      groupIdentify() {
        captures += 1;
      }
      flush() {
        const gate = Promise.withResolvers<void>();
        flushes.push(gate);
        return gate.promise;
      }
      async shutdown() {
        shutdowns += 1;
      }
    },
  }));
  const path = fileURLToPath(
    new URL("../src/server.isolated-baseline.ts", import.meta.url)
  );
  if (existsSync(path)) {
    throw new Error(`Refusing to overwrite ${path}`);
  }
  writeFileSync(
    path,
    execFileSync(
      "git",
      [
        "show",
        `${WORKFLOW_OPTIMIZATION_BASELINE_SHA}:packages/posthog/src/server.ts`,
      ],
      {
        cwd: fileURLToPath(new URL("../../../", import.meta.url)),
      }
    )
  );
  afterAll(() => {
    unlinkSync(path);
  });
  const changed = await import("../src/server");
  const baselinePath = "../src/server.isolated-baseline.ts";
  const original: typeof changed = await import(baselinePath);
  const drainMicrotasks = async () => {
    for (let i = 0; i < 8; i++) {
      await Promise.resolve();
    }
  };
  beforeEach(async () => {
    await changed.shutdownPostHogServer();
    await original.shutdownPostHogServer();
    flushes.length = 0;
    captures = 0;
    shutdowns = 0;
  });
  test("32 concurrent flush callers: 32 -> 1 SDK calls", async () => {
    const previous = Array.from({ length: 32 }, () =>
      original.flushPostHogServer()
    );
    expect(flushes).toHaveLength(32);
    for (const gate of flushes) {
      gate.resolve();
    }
    await Promise.all(previous);
    flushes.length = 0;
    const current = Array.from({ length: 32 }, () =>
      changed.flushPostHogServer()
    );
    await drainMicrotasks();
    expect(flushes).toHaveLength(1);
    flushes[0]?.resolve();
    await Promise.all(current);
    console.log(
      "PostHog fixture: 32 -> 1 manual SDK flush calls (not a network savings claim)"
    );
  });
  test.each(["capture", "exception", "group", "person"] as const)(
    "late %s is covered before its flush caller resolves",
    async (kind) => {
      const first = changed.flushPostHogServer();
      await drainMicrotasks();
      if (kind === "capture") {
        changed.captureServerEvent({
          event: "geo_scan_started",
          organizationId: "org",
        });
      }
      if (kind === "exception") {
        changed.captureServerException({
          error: new Error("synthetic"),
          organizationId: "org",
        });
      }
      if (kind === "group") {
        changed.identifyServerGroup({
          groupType: "organization",
          groupKey: "org",
        });
      }
      if (kind === "person") {
        changed.setServerPersonProperties({
          distinctId: "demo-person",
          set: { demo: true },
        });
      }
      let finished = false;
      const second = changed.flushPostHogServer().then(() => {
        finished = true;
      });
      flushes[0]?.resolve();
      await first;
      await drainMicrotasks();
      expect(captures).toBe(1);
      expect(flushes).toHaveLength(2);
      expect(finished).toBe(false);
      flushes[1]?.resolve();
      await second;
      expect(finished).toBe(true);
    }
  );
  test("many late callers share one follow-up barrier", async () => {
    const first = changed.flushPostHogServer();
    await drainMicrotasks();
    changed.captureServerEvent({
      event: "geo_scan_completed",
      organizationId: "org",
    });
    const late = Array.from({ length: 32 }, () => changed.flushPostHogServer());
    flushes[0]?.resolve();
    await first;
    await drainMicrotasks();
    expect(flushes).toHaveLength(2);
    flushes[1]?.resolve();
    await Promise.all(late);
  });
  test("outage is swallowed once without a retry storm; next call recovers", async () => {
    const calls = Array.from({ length: 32 }, () =>
      changed.flushPostHogServer()
    );
    await drainMicrotasks();
    flushes[0]?.reject(new Error("synthetic outage"));
    await Promise.all(calls);
    expect(flushes).toHaveLength(1);
    const recovery = changed.flushPostHogServer();
    await drainMicrotasks();
    expect(flushes).toHaveLength(2);
    flushes[1]?.resolve();
    await recovery;
  });
  test("shutdown waits for its active flush and a new client does not join the old barrier", async () => {
    const flushing = changed.flushPostHogServer();
    await drainMicrotasks();
    const stopping = changed.shutdownPostHogServer();
    await drainMicrotasks();
    expect(shutdowns).toBe(0);
    flushes[0]?.resolve();
    await flushing;
    await stopping;
    expect(shutdowns).toBe(1);
    const fresh = changed.flushPostHogServer();
    await drainMicrotasks();
    expect(flushes).toHaveLength(2);
    flushes[1]?.resolve();
    await fresh;
  });
}
