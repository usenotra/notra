import { beforeEach, expect, mock, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { WEB_SESSION_TTL_SECONDS } from "../src/constants/web-analytics";
import { WEB_SESSION_RESOLVE_SCRIPT } from "../src/constants/web-session";
import type { WebPageViewInput, WebSession } from "../src/types/ingest";
import { CHROME } from "./constants/web-page-view";
import { deferred } from "./utils/deferred";

function view(path: string, referer?: string): WebPageViewInput {
  const url = new URL(`https://acme.com${path}`);
  return {
    identity: { organizationId: "org", projectId: "prj", generation: 1 },
    payload: {
      method: "GET",
      url: url.href,
      userAgent: CHROME,
      ip: "1.2.3.4",
      referer,
    },
    url,
    capturedAt: new Date("2026-10-06T12:00:00Z"),
    classification: {
      visitorType: "human",
      source: "human",
      agent: "",
      category: "",
      confidence: "",
    },
  } as WebPageViewInput;
}

if (process.env.NOTRA_WEB_ANALYTICS_TEST_WORKER !== import.meta.url) {
  test("web-session runs with process-isolated module mocks", () => {
    const result = spawnSync(
      process.execPath,
      ["test", "--isolate", fileURLToPath(import.meta.url)],
      {
        env: {
          ...process.env,
          NOTRA_WEB_ANALYTICS_TEST_WORKER: import.meta.url,
        },
        timeout: 30_000,
      }
    );
    expect(result.status, result.stderr?.toString()).toBe(0);
  }, 35_000);
} else {
  const store = new Map<string, WebSession>();
  let fail = false;
  let gate = Promise.resolve();
  mock.module("@notra/ai/utils/redis", () => ({
    redis: {
      eval: async (
        script: string,
        keys: [string],
        args: [string, string, number]
      ) => {
        await gate;
        if (fail) {
          throw new Error("Redis unavailable");
        }
        expect(script).toBe(WEB_SESSION_RESOLVE_SCRIPT);
        expect(args[2]).toBe(WEB_SESSION_TTL_SECONDS);
        const current = store.get(keys[0]);
        const next =
          current && (!args[1] || current.origin === args[1])
            ? { ...current, index: current.index + 1 }
            : { id: args[0], index: 1, origin: args[1] };
        store.set(keys[0], next);
        return [next.id, next.index];
      },
    },
  }));

  const { buildWebPageView } = await import("../src/ingest/web");

  beforeEach(() => {
    store.clear();
    fail = false;
    gate = Promise.resolve();
  });

  test("a source opens one session; the same source again continues it", async () => {
    const google = "https://www.google.com/";
    const landing = await buildWebPageView(view("/", google));
    const redirected = await buildWebPageView(view("/en", google));
    const clicked = await buildWebPageView(
      view("/en/pricing", "https://acme.com/en")
    );
    const fromX = await buildWebPageView(view("/en", "https://t.co/abc"));

    expect(landing?.session_page_index).toBe(1);
    expect(redirected?.session_id).toBe(landing?.session_id);
    expect(redirected?.session_page_index).toBe(2);
    expect(clicked?.session_id).toBe(landing?.session_id);
    expect(clicked?.session_page_index).toBe(3);
    expect(fromX?.session_id).not.toBe(landing?.session_id);
    expect(fromX?.session_page_index).toBe(1);
  });

  test("concurrent first views allocate one session and unique page indexes", async () => {
    const ready = deferred<void>();
    gate = ready.promise;
    const pending = Array.from({ length: 20 }, () =>
      buildWebPageView(view("/"))
    );
    ready.resolve();
    const rows = await Promise.all(pending);
    expect(new Set(rows.map((row) => row?.session_id)).size).toBe(1);
    expect(
      rows
        .map((row) => row?.session_page_index)
        .sort((a, b) => (a ?? 0) - (b ?? 0))
    ).toEqual(Array.from({ length: 20 }, (_, index) => index + 1));
    expect(rows.filter((row) => row?.session_page_index === 2)).toHaveLength(1);
  });

  test("404 facts do not advance successful-content sessions", async () => {
    const missing = view("/missing", "https://www.google.com/");
    missing.payload.status = 404;
    const error = await buildWebPageView(missing);
    expect(error).toMatchObject({
      status: 404,
      session_id: "",
      session_page_index: 0,
    });
    expect(store.size).toBe(0);
    const landing = await buildWebPageView(
      view("/", "https://www.google.com/")
    );
    const next = await buildWebPageView(view("/pricing", "https://acme.com/"));
    expect(landing?.session_page_index).toBe(1);
    expect(next?.session_page_index).toBe(2);
    expect(next?.session_id).toBe(landing?.session_id);
    const laterMissing = await buildWebPageView(missing);
    expect(laterMissing?.session_id).toBe("");
    const third = await buildWebPageView(
      view("/about", "https://acme.com/pricing")
    );
    expect(third?.session_page_index).toBe(3);
  });

  test("concurrent continuations count the engaged session only once", async () => {
    const landing = await buildWebPageView(view("/"));
    const ready = deferred<void>();
    gate = ready.promise;
    const pending = [
      buildWebPageView(view("/a")),
      buildWebPageView(view("/b")),
    ];
    ready.resolve();
    const rows = await Promise.all(pending);
    expect(rows.map((row) => row?.session_id)).toEqual([
      landing?.session_id,
      landing?.session_id,
    ]);
    expect(rows.map((row) => row?.session_page_index).sort()).toEqual([2, 3]);
  });

  test("Redis failures isolate each view instead of merging the day's visits", async () => {
    fail = true;
    const rows = await Promise.all([
      buildWebPageView(view("/a")),
      buildWebPageView(view("/b")),
    ]);
    expect(rows[0]?.visitor_id).toBe(rows[1]?.visitor_id);
    expect(rows[0]?.session_id).not.toBe(rows[1]?.session_id);
    expect(rows.map((row) => row?.session_page_index)).toEqual([0, 0]);
  });
}
