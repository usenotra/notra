import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";

import type { ProxyMatcher } from "next/dist/build/analysis/get-page-static-info";

const MATCHER_LITERAL_PATTERN = /matcher:\s*\[\s*("(?:[^"\\]|\\.)*")/;

// Not part of Next's public types, but it is the function the build uses to
// compile `config.matcher`, so the test sees exactly what production sees.
const { getMiddlewareMatchers } = createRequire(import.meta.url)(
  "next/dist/build/analysis/get-page-static-info"
) as {
  getMiddlewareMatchers: (
    matcher: string[],
    nextConfig: { basePath: string }
  ) => ProxyMatcher[];
};

/**
 * Next only honors a literal matcher, so the literal is read from source.
 * Importing proxy.ts would instantiate AuthKit and needs WorkOS credentials.
 */
async function loadProxyMatcher(): Promise<RegExp> {
  const source = await readFile(
    new URL("../src/proxy.ts", import.meta.url),
    "utf8"
  );
  const literal = source.match(MATCHER_LITERAL_PATTERN)?.[1];
  if (!literal) {
    throw new Error("Could not find the matcher literal in src/proxy.ts");
  }
  const [compiled] = getMiddlewareMatchers([JSON.parse(literal)], {
    basePath: "",
  });
  if (!compiled) {
    throw new Error("Next did not compile the proxy matcher");
  }
  return new RegExp(compiled.regexp);
}

const matcher = await loadProxyMatcher();

describe("proxy matcher", () => {
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
    "/_next/static/chunks/main.js",
    "/favicon.ico",
  ])("skips AuthKit for machine and static route %s", (path) => {
    expect(matcher.test(path)).toBe(false);
  });

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
    // Look-alikes of excluded families must keep the proxy.
    "/api/webhooksx",
    "/api/geo/ingestion",
    "/api/geo/ingest-preview",
    "/api/healthcheckx",
    "/api/cronjobs",
    "/api/workflowsx",
    "/api/internalx",
    "/.well-known/workflowx",
    "/ingestion-settings",
  ])("runs AuthKit for session route %s", (path) => {
    expect(matcher.test(path)).toBe(true);
  });
});
