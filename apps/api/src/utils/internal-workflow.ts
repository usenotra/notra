import {
  InternalDashboardAdapterError,
  InternalDashboardError,
  InternalDashboardTimeoutError,
} from "@notra/schemas/api/internal-dashboard";
import { internalWorkflowStartResponseSchema } from "@notra/schemas/api/internal-workflow";
import { Effect } from "effect";
import type { ZodType } from "zod";

import {
  InternalDashboardService,
  internalDashboardLive,
} from "../lib/internal-dashboard";
import { runServiceEffect } from "./run-service-effect";
export { InternalDashboardError, InternalDashboardTimeoutError };

interface InternalWorkflowEnv {
  WORKFLOW_BASE_URL?: string;
}

function trimTrailingSlash(value: string) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

export function getInternalWorkflowUrl(env: InternalWorkflowEnv, path: string) {
  if (!env.WORKFLOW_BASE_URL) {
    return null;
  }

  return `${trimTrailingSlash(env.WORKFLOW_BASE_URL)}${path}`;
}

/**
 * Ceiling for an internal call that runs work synchronously rather than
 * handing off to a workflow (currently GEO sequence runs and brief planning).
 *
 * Two things matter here. First, no timeout at all is wrong: Bun's `fetch`
 * never gives up on its own, so a wedged dashboard would pin an API request
 * forever. Second, a *short* timeout is worse than none — the dashboard keeps
 * running and keeps billing after we hang up, and the client sees a failure it
 * is tempted to retry, paying twice.
 *
 * The practical ceiling is not ours to set, and two limits bound it. Outbound,
 * Node's undici caps the wait for response headers at 300s and we cannot raise
 * that without taking a direct `undici` dependency to install a custom
 * dispatcher. Inbound, the API's own socket is the tighter one: Bun closes a
 * connection that has sent no bytes for `idleTimeout` seconds (see the server
 * export in `src/index.ts`), and Bun caps that setting at 255s — so a request
 * held longer than that dies as a zero-byte socket close, with no status for
 * the client to act on.
 *
 * Hence 240s < 255s (our socket idle timeout) < 300s (undici's header wait):
 * the abort is ours and deterministic across Bun and Node, and it fires early
 * enough that we can still write the 503 before anything hangs up on us.
 * Phase 6 (durable workflow) removes the need for a long-held request
 * altogether.
 */
export const SYNCHRONOUS_INTERNAL_CALL_TIMEOUT_MS = 240_000;

/**
 * POSTs to an internal dashboard route and decodes its successful JSON body.
 *
 * Same authentication as `startDashboardWorkflow` (shared secret first, Vercel
 * OIDC as the fallback); this is the general form for internal routes that
 * answer with something other than `{ runId }`.
 *
 * `timeoutMs` is opt-in only for immediate hand-off routes. A route that runs
 * paid work inline must pass `SYNCHRONOUS_INTERNAL_CALL_TIMEOUT_MS` through
 * `runRemoteGeoEffect`, which makes the timeout mandatory for that boundary.
 */
export async function callDashboardInternal<A>(
  url: string,
  payload: unknown,
  responseSchema: ZodType<A>,
  timeoutMs?: number
): Promise<A> {
  return runServiceEffect(
    Effect.gen(function* () {
      const service = yield* InternalDashboardService;
      return yield* service.call(url, payload, responseSchema, timeoutMs);
    }).pipe(Effect.provide(internalDashboardLive))
  );
}

export async function startDashboardWorkflow(
  url: string,
  payload: unknown
): Promise<string> {
  const data = await callDashboardInternal(
    url,
    payload,
    internalWorkflowStartResponseSchema
  );
  return data.runId;
}

export const startDashboardWorkflowEffect = Effect.fn(
  "InternalDashboard.startWorkflow"
)(function* (url: string | null, payload: unknown) {
  if (!url) {
    return yield* Effect.fail(
      new InternalDashboardAdapterError({
        kind: "configuration",
        message:
          "WORKFLOW_BASE_URL is not configured — cannot reach the dashboard.",
      })
    );
  }
  const service = yield* InternalDashboardService;
  const data = yield* service.call(
    url,
    payload,
    internalWorkflowStartResponseSchema
  );
  return data.runId;
});
