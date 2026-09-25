import { expect, mock, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

if (process.env.NOTRA_POSTHOG_LIFECYCLE_TEST !== "1") {
  test("PostHog request and workflow lifetimes", () => {
    const result = spawnSync(
      process.execPath,
      ["test", fileURLToPath(import.meta.url)],
      {
        env: { ...process.env, NOTRA_POSTHOG_LIFECYCLE_TEST: "1" },
      }
    );
    expect(result.status, result.stderr.toString()).toBe(0);
  });
} else {
  const pending: (() => Promise<void>)[] = [];
  const capture = mock(() => undefined);
  let resolveFlush: () => void = () => undefined;
  const flush = mock(
    () =>
      new Promise<void>((resolve) => {
        resolveFlush = resolve;
      })
  );
  mock.module("next/server", () => ({
    after: (callback: () => Promise<void>) => pending.push(callback),
  }));
  mock.module("@notra/posthog/server", () => ({
    captureServerEvent: capture,
    captureServerException: capture,
    identifyServerGroup: capture,
    setServerPersonProperties: capture,
    flushPostHogServer: flush,
  }));
  const adapter = await import("../src/lib/analytics/posthog-server");

  test("capture does not start during prerender; after awaits delivery", async () => {
    adapter.trackServerException({ error: new Error("fixture") });
    expect(capture).not.toHaveBeenCalled();
    expect(flush).not.toHaveBeenCalled();
    let finished = false;
    const callback = pending[0];
    if (!callback) {
      throw new Error("Expected after callback");
    }
    const delivery = callback().then(() => {
      finished = true;
    });
    expect(capture).toHaveBeenCalledTimes(1);
    await Promise.resolve();
    expect(finished).toBe(false);
    resolveFlush();
    await delivery;
    expect(finished).toBe(true);
  });

  test("workflow API awaits delivery without scheduling after", async () => {
    let finished = false;
    const delivery = adapter
      .trackServerEventAndFlush({ event: "fixture" } as never)
      .then(() => {
        finished = true;
      });
    expect(pending).toHaveLength(1);
    await Promise.resolve();
    expect(finished).toBe(false);
    resolveFlush();
    await delivery;
    expect(finished).toBe(true);
  });
}
