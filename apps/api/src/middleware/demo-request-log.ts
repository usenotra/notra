import { extractDemoAffected } from "@notra/ai/utils/demo-affected";
import { recordDemoRequest } from "@notra/ai/utils/demo-request-log";
import { DEMO_CONSOLE_HEADER } from "@notra/utils/constants/demo";
import type { Context, Next } from "hono";

import { getOrganizationIdFromAuth } from "../types/auth";
import type { ApiEnv } from "../types/env";

const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

async function readBody(source: Request | Response): Promise<string | null> {
  try {
    const text = await source.clone().text();
    return text.length > 0 ? text : null;
  } catch {
    return null;
  }
}

/**
 * Public demo only: writes every authenticated request into the visitor's
 * request feed (and pushes it live to the dashboard) so API calls from curl,
 * the CLI, MCP or the in-app console show up next to what they changed.
 */
export async function demoRequestLogMiddleware(c: Context<ApiEnv>, next: Next) {
  const startedAt = performance.now();
  const requestBody = MUTATION_METHODS.has(c.req.method)
    ? await readBody(c.req.raw)
    : null;

  await next();

  const auth = c.get("auth");
  const organizationId = auth ? getOrganizationIdFromAuth(auth) : null;
  if (!organizationId) {
    return;
  }
  const path = new URL(c.req.url).pathname;
  const responseBody = await readBody(c.res);
  const isMutation = MUTATION_METHODS.has(c.req.method);
  const record = recordDemoRequest({
    organizationId,
    source: c.req.header(DEMO_CONSOLE_HEADER) ? "console" : "api",
    method: c.req.method,
    path,
    status: c.res.status,
    durationMs: performance.now() - startedAt,
    requestBody,
    responseBody,
    affected:
      isMutation && c.res.ok ? extractDemoAffected(path, responseBody) : [],
  });
  // Bun serves this app directly, so finishing the write before responding
  // is the only way to guarantee it; it adds a few milliseconds in the demo.
  await record;
}
