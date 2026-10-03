import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import { dashboardAuthMiddleware } from "../src/middleware/auth";

const originalEnvironment = { ...process.env };

beforeEach(() => {
  Reflect.set(process.env, "NODE_ENV", "development");
  process.env.DEV_AUTH_ENABLED = "true";
  delete process.env.DEV_AUTH_EMAIL;
  delete process.env.WORKOS_API_KEY;
  delete process.env.NOTRA_DEMO_MODE;
});

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

async function requestThroughMiddleware(pathname: string) {
  const handler = dashboardAuthMiddleware.options.server;
  if (!handler) {
    throw new Error("Missing dashboard authentication middleware");
  }
  const request = new Request(`http://localhost:3000${pathname}`, {
    headers: { host: "localhost:3000" },
  });
  const result = await handler({
    request,
    pathname,
    handlerType: "router",
    context: undefined,
    next: async () => ({
      request,
      pathname,
      context: undefined,
      response: new Response("downstream", { status: 202 }),
    }),
  } as Parameters<typeof handler>[0]);
  return result instanceof Response ? result : result.response;
}

describe("native authentication middleware route boundaries", () => {
  test.each([
    "/api/webhooks/github/org/integration/repository",
    "/api/webhooks/workos",
    "/api/geo/ingest",
    "/api/cron/monitoring",
    "/api/cron/geo-scan",
    "/api/healthcheck",
    "/api/workflows/iris",
    "/api/internal/workflows/geo-scan",
    "/api/internal/geo/sequence-run",
    "/.well-known/workflow/v1/step",
    "/.well-known/workflow/v1/flow",
    "/ingest/i/v0/e/",
    "/ingest/static/array.js",
    "/assets/dashboard.js",
    "/assets/dashboard.css",
    "/api/image",
    "/favicon.ico",
    "/design.md",
  ])(
    "bypasses session authentication for machine or static route %s",
    async (path) => {
      const response = await requestThroughMiddleware(path);
      expect(response.status).toBe(202);
      expect(await response.text()).toBe("downstream");
    }
  );

  test.each([
    "/",
    "/login",
    "/signup",
    "/callback",
    "/bejanic/geo",
    "/rpc/geo/overview",
    "/api/session",
    "/api/autumn/check",
    "/.well-known/oauth-authorization-server",
    "/api/webhooksx",
    "/api/geo/ingestion",
    "/api/geo/ingest-preview",
    "/api/healthcheckx",
    "/api/cronjobs",
    "/api/workflowsx",
    "/api/internalx",
    "/.well-known/workflowx",
    "/ingestion-settings",
    "/design.md-team",
    "/design.mdx",
    "/assets-team",
    "/api/images",
    "/api/image-preview",
  ])(
    "retains authentication for session route or excluded-family look-alike %s",
    async (path) => {
      const response = await requestThroughMiddleware(path);
      expect(response.status).toBe(403);
      expect(await response.text()).toContain("DEV_AUTH_EMAIL");
    }
  );
});
