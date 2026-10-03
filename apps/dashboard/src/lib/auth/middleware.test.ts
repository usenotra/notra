import { afterEach, describe, expect, test } from "bun:test";

import { dashboardAuthMiddleware } from "../../middleware/auth";

const originalEnvironment = { ...process.env };

afterEach(() => {
  for (const name of [
    "NODE_ENV",
    "DEV_AUTH_ENABLED",
    "DEV_AUTH_EMAIL",
    "WORKOS_API_KEY",
    "NOTRA_DEMO_MODE",
  ]) {
    const value = originalEnvironment[name];
    if (value === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = value;
    }
  }
});

async function invokeMiddleware(path: string, headers?: HeadersInit) {
  const handler = dashboardAuthMiddleware.options.server;
  if (!handler) {
    throw new Error("Missing auth middleware");
  }
  const request = new Request(`http://localhost:3000${path}`, { headers });
  const nextResponse = new Response("downstream", { status: 202 });
  const result = await handler({
    request,
    pathname: new URL(request.url).pathname,
    handlerType: "router",
    context: undefined,
    next: async () => ({
      response: nextResponse,
      request,
      pathname: new URL(request.url).pathname,
      context: undefined,
    }),
  } as Parameters<typeof handler>[0]);
  return result instanceof Response ? result : result.response;
}

describe("dashboard authentication middleware", () => {
  test("serves assets, optimized images, and machine endpoints without WorkOS", async () => {
    Reflect.set(process.env, "NODE_ENV", "production");
    delete process.env.WORKOS_API_KEY;
    for (const path of [
      "/assets/dashboard.js",
      "/assets/dashboard.css",
      "/api/image?url=%2Fdemo%2Fsample.png",
      "/api/healthcheck",
      "/api/webhooks/workos",
      "/api/cron/geo-scan",
      "/api/internal/workflows/geo-scan",
      "/api/workflows/schedule",
      "/.well-known/workflow/v1/step",
    ]) {
      const response = await invokeMiddleware(path);
      expect(response.status).toBe(202);
      expect(await response.text()).toBe("downstream");
    }
  });

  test("keeps design-system routes unavailable in production", async () => {
    Reflect.set(process.env, "NODE_ENV", "production");
    expect((await invokeMiddleware("/design-system/auth-flow")).status).toBe(
      404
    );
  });

  test("allows explicitly opted-in loopback development requests", async () => {
    Reflect.set(process.env, "NODE_ENV", "development");
    process.env.DEV_AUTH_ENABLED = "true";
    process.env.DEV_AUTH_EMAIL = "developer@example.test";
    delete process.env.WORKOS_API_KEY;
    delete process.env.NOTRA_DEMO_MODE;
    const response = await invokeMiddleware("/workspace", {
      host: "localhost:3000",
    });
    expect(response.status).toBe(202);
  });

  test("rejects forwarded requests and missing identity during local impersonation", async () => {
    Reflect.set(process.env, "NODE_ENV", "development");
    process.env.DEV_AUTH_ENABLED = "true";
    process.env.DEV_AUTH_EMAIL = "developer@example.test";
    delete process.env.WORKOS_API_KEY;
    delete process.env.NOTRA_DEMO_MODE;
    expect(
      (
        await invokeMiddleware("/workspace", {
          host: "localhost:3000",
          "x-forwarded-for": "203.0.113.1",
        })
      ).status
    ).toBe(403);
    delete process.env.DEV_AUTH_EMAIL;
    expect(
      (await invokeMiddleware("/workspace", { host: "localhost:3000" })).status
    ).toBe(403);
  });
});
