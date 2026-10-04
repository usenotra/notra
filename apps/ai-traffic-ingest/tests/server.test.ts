import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { createHmac } from "node:crypto";

import { startService } from "./utils/service";

let configured: Awaited<ReturnType<typeof startService>>;
let unconfigured: Awaited<ReturnType<typeof startService>>;

beforeAll(async () => {
  [configured, unconfigured] = await Promise.all([
    startService({
      DATABASE_URL: "postgres://test:test@127.0.0.1:1/test",
      UPSTASH_REDIS_REST_URL: "http://127.0.0.1:1",
      UPSTASH_REDIS_REST_TOKEN: "test",
      TINYBIRD_TOKEN: "test",
      GEO_INGEST_SECRET: "test-ingest-secret",
    }),
    startService(),
  ]);
});

afterAll(async () => {
  await Promise.all([configured?.stop(), unconfigured?.stop()]);
});

describe("standalone ingest HTTP service", () => {
  test("starts without credentials but does not accept traffic", async () => {
    const health = await fetch(`${unconfigured.url}/healthz`);
    expect(health.status).toBe(200);
    const ready = await fetch(`${unconfigured.url}/readyz`);
    expect(ready.status).toBe(503);
    expect(await ready.json()).toEqual({ ready: false });
    const ingest = await fetch(`${unconfigured.url}/api/geo/ingest`, {
      method: "POST",
    });
    expect(ingest.status).toBe(503);
    expect(ingest.headers.get("cache-control")).toBe("no-store");
  });

  test("rejects missing and invalid tokens before reading the payload", async () => {
    for (const authorization of ["", "Bearer invalid-token"]) {
      const response = await fetch(`${configured.url}/api/geo/ingest`, {
        method: "POST",
        headers: { authorization },
        body: "invalid-json",
      });
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: "Unauthorized" });
    }
  });

  test("drops ordinary visitors without contacting database, Redis or Tinybird", async () => {
    const scope = "org_test.project_test";
    const signature = createHmac("sha256", "test-ingest-secret")
      .update(scope)
      .digest("hex");
    const response = await fetch(`${configured.url}/api/geo/ingest`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${scope}.${signature}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        method: "GET",
        url: "https://example.com/",
        userAgent: "Mozilla/5.0",
      }),
    });
    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ ok: true });
  });

  test("bounds the request body", async () => {
    const response = await fetch(`${configured.url}/api/geo/ingest`, {
      method: "POST",
      body: "x".repeat(65 * 1024),
    });
    expect(response.status).toBe(413);
  });
});
