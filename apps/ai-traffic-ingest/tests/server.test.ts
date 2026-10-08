import { afterAll, beforeAll, describe, expect, test } from "bun:test";

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
  const exits = await Promise.all([configured?.stop(), unconfigured?.stop()]);
  expect(exits).toEqual([0, 0]);
});

describe("standalone ingest HTTP service", () => {
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

  test("bounds the request body", async () => {
    const response = await fetch(`${configured.url}/api/geo/ingest`, {
      method: "POST",
      body: "x".repeat(65 * 1024),
    });
    expect(response.status).toBe(413);
  });
});
