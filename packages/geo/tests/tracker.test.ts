import { expect, test } from "bun:test";

import { Tracker } from "../src/tracker";

test("ordinary human page requests reach ingest without a tracking option", async () => {
  const bodies: string[] = [];
  const tracker = new Tracker({
    token: "test-token",
    fetch: async (_input, init) => {
      bodies.push(String(init?.body));
      return new Response(null, { status: 202 });
    },
  });
  await tracker.track(
    new Request("https://example.com/docs", {
      headers: {
        "user-agent": "Mozilla/5.0 Chrome/130.0.0.0 Safari/537.36",
        "sec-fetch-mode": "navigate",
      },
    })
  );
  expect(bodies).toHaveLength(1);
  expect(JSON.parse(bodies[0] ?? "")).toMatchObject({
    method: "GET",
    url: "https://example.com/docs",
    signals: { fetchMode: "navigate", prefetch: false },
  });
});

test("automatic capture retains asset and method exclusions and prefetch signals", () => {
  const tracker = new Tracker({ token: "test-token" });
  expect(
    tracker.buildPayload(new Request("https://example.com/app.css"))
  ).toBeNull();
  expect(
    tracker.buildPayload(
      new Request("https://example.com/docs", { method: "POST" })
    )
  ).toBeNull();
  expect(
    tracker.buildPayload(
      new Request("https://example.com/docs", {
        headers: { "sec-purpose": "prefetch" },
      })
    )?.signals?.prefetch
  ).toBe(true);
});
