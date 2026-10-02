import { afterEach, expect, test } from "bun:test";

import { Hono } from "hono";

import { geoEntitlementMiddleware } from "../src/middleware/geo-entitlement";

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("middleware shares successful checks across requests and drops grants on key rotation", async () => {
  const checks: unknown[] = [];
  globalThis.fetch = async (input, init) => {
    const request = new Request(input, init);
    expect(new URL(request.url).hostname).toBe("api.useautumn.com");
    const body = await request.json();
    checks.push(body);
    const entitled =
      request.headers.get("authorization") === "Bearer first-key";
    return Response.json({
      allowed: false,
      customer_id: body.customer_id,
      feature_id: "ai_answers",
      flag: null,
      balance: entitled
        ? {
            feature_id: "ai_answers",
            granted: 1000,
            usage: 1000,
            remaining: 0,
            unlimited: false,
            overage_allowed: false,
            max_purchase: null,
            next_reset_at: null,
          }
        : null,
    });
  };
  const app = new Hono();
  app.use("*", async (c, next) => {
    c.set("auth", {
      identity: { externalId: c.req.header("x-test-org") ?? "org-a" },
    });
    await next();
  });
  app.use("*", geoEntitlementMiddleware());
  app.get("/", (c) => c.json({ ok: true }));
  const request = (key: string, org = "org-a") =>
    app.request(
      "/",
      { headers: { "x-test-org": org } },
      { AUTUMN_SECRET_KEY: key }
    );
  expect((await request("first-key")).status).toBe(200);
  expect((await request("first-key")).status).toBe(200);
  expect(checks).toHaveLength(1);
  expect((await request("first-key", "org-b")).status).toBe(200);
  expect(checks).toHaveLength(2);
  expect((await request("rotated-key")).status).toBe(402);
  expect((await request("rotated-key")).status).toBe(402);
  expect(checks).toHaveLength(4);
  expect((await request("")).status).toBe(503);
  expect(checks).toHaveLength(4);
});
