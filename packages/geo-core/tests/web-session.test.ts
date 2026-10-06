import { expect, mock, test } from "bun:test";

import type { WebPageViewInput } from "../src/types/ingest";

const store = new Map<string, unknown>();
mock.module("@notra/ai/utils/redis", () => ({
  redis: {
    get: async (key: string) => store.get(key) ?? null,
    set: async (key: string, value: unknown) => {
      store.set(key, value);
      return "OK";
    },
  },
}));

const { buildWebPageView } = await import("../src/ingest/web");

const CHROME =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

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
