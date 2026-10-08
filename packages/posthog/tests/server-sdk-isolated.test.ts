/// <reference lib="es2024.promise" />
import { expect, mock, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

if (process.env.NOTRA_POSTHOG_SDK_WORKER !== "1") {
  test("real PostHog SDK with synthetic local HTTP adapter", () => {
    const result = spawnSync(
      process.execPath,
      ["test", fileURLToPath(import.meta.url)],
      {
        env: {
          PATH: process.env.PATH,
          HOME: process.env.HOME,
          TMPDIR: process.env.TMPDIR,
          NODE_ENV: "test",
          NOTRA_POSTHOG_SDK_WORKER: "1",
        },
        timeout: 20_000,
      }
    );
    expect(result.status, result.stderr.toString()).toBe(0);
  }, 25_000);
} else {
  globalThis.fetch = mock(() => {
    throw new Error("External network is forbidden");
  });
  process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN = "synthetic-token";
  process.env.NEXT_PUBLIC_POSTHOG_HOST = "https://posthog.example.invalid";
  const { PostHog: RealPostHog } = await import("posthog-node");
  let requests = 0;
  let queued = Promise.withResolvers<void>();
  let release = Promise.withResolvers<void>();
  mock.module("posthog-node", () => ({
    PostHog: class extends RealPostHog {
      constructor(
        token: string,
        options: ConstructorParameters<typeof RealPostHog>[1]
      ) {
        super(token, {
          ...options,
          fetch: async () => {
            requests += 1;
            queued.resolve();
            await release.promise;
            return new Response("{}", { status: 200 });
          },
        });
      }
    },
  }));
  const server = await import("../src/server");
  test("coalescing changes flush work, not the already-coalesced HTTP count", async () => {
    const outcomes = [];
    for (const coalesced of [false, true]) {
      requests = 0;
      queued = Promise.withResolvers<void>();
      release = Promise.withResolvers<void>();
      const client = server.getPostHogServer();
      if (!client) {
        throw new Error("Synthetic SDK client missing");
      }
      let calls = 0;
      const flush = client.flush.bind(client);
      client.flush = () => {
        calls += 1;
        return flush();
      };
      server.captureServerEvent({
        event: "geo_scan_started",
        organizationId: "demo-org",
      });
      await queued.promise;
      const before = calls;
      const work = Array.from({ length: 32 }, () =>
        coalesced ? server.flushPostHogServer() : client.flush()
      );
      for (let i = 0; i < 8; i++) {
        await Promise.resolve();
      }
      expect(calls - before).toBe(coalesced ? 1 : 32);
      release.resolve();
      await Promise.all(work);
      outcomes.push({
        manualSDKFlushes: calls - before,
        mockHTTPRequests: requests,
      });
      await server.shutdownPostHogServer();
    }
    expect(outcomes).toEqual([
      { manualSDKFlushes: 32, mockHTTPRequests: 1 },
      { manualSDKFlushes: 1, mockHTTPRequests: 1 },
    ]);
    console.log(
      "Real PostHog SDK 5.50.0: manual flush calls32->1; synthetic HTTP requests1->1"
    );
  });
}
