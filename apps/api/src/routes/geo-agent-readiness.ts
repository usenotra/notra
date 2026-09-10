import { createRoute } from "@hono/zod-openapi";
import {
  loadAgentReadiness,
  startAgentReadinessScan,
} from "@notra/geo-core/geo/agent-readiness";
import { requireGeoProject } from "@notra/geo-core/geo/projects";
import {
  AgentReadinessApiError,
  AgentReadinessTargetMissingError,
} from "@notra/geo-core/schemas/agent-readiness-errors";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import {
  agentReadinessResponseSchema,
  agentReadinessScanResponseSchema,
} from "@notra/schemas/api/geo-agent-readiness";
import { projectParamsSchema } from "@notra/schemas/api/geo-params";
import { Effect } from "effect";

import { API_TRIGGER_SOURCE } from "../constants/analytics";
import {
  GEO_COMMON_ERROR_RESPONSES,
  GEO_OPENAPI_TAG,
} from "../constants/geo-openapi";
import { geoCoreApiLayer } from "../lib/geo/configure";
import { trackApiEvent } from "../utils/analytics";
import { geoErrorResponse } from "../utils/geo";
import { runGeoEffect } from "../utils/geo-effect";
import { logError } from "../utils/logging";
import { createOpenApiApp } from "../utils/openapi-app";
import { rateLimitResponse } from "../utils/openapi-responses";
import { enforceRatelimit, RATE_LIMITS, ratelimit } from "../utils/ratelimit";

/** Agent readiness reports. */
export const geoAgentReadinessRoutes = createOpenApiApp();

const GEO_TAG = GEO_OPENAPI_TAG;
const commonErrors = GEO_COMMON_ERROR_RESPONSES;

const getReadinessRoute = createRoute({
  method: "get",
  path: "/projects/{projectId}/geo/agent-readiness",
  tags: [GEO_TAG],
  operationId: "getGeoAgentReadiness",
  summary: "Get the latest agent readiness report",
  description:
    "The most recent completed report for the project's website, any newer run still in flight or failed, and the score history. Returns stored data only; it never starts a scan.",
  request: { params: projectParamsSchema },
  responses: {
    200: {
      description: "Report fetched successfully",
      content: {
        "application/json": { schema: agentReadinessResponseSchema },
      },
    },
    ...commonErrors,
  },
});

const startScanRoute = createRoute({
  method: "post",
  path: "/projects/{projectId}/geo/agent-readiness/scan",
  tags: [GEO_TAG],
  operationId: "startGeoAgentReadinessScan",
  summary: "Start an agent readiness scan",
  description:
    "Queues a readiness scan for the project's website. A scan already running against the same URL is reused rather than duplicated, in which case `alreadyRunning` is true.",
  request: { params: projectParamsSchema },
  responses: {
    202: {
      description: "Scan accepted",
      content: {
        "application/json": { schema: agentReadinessScanResponseSchema },
      },
    },
    ...commonErrors,
    429: rateLimitResponse(
      RATE_LIMITS.agentReadinessScan.requests,
      RATE_LIMITS.agentReadinessScan.window
    ),
  },
});

/** Maps the readiness helpers' thrown errors onto statuses. */
function readinessFailure(error: unknown): {
  status: 400 | 500;
  error: string;
} {
  if (
    error instanceof AgentReadinessTargetMissingError ||
    error instanceof AgentReadinessApiError
  ) {
    return { status: 400, error: error.message };
  }
  return { status: 500, error: "Internal server error" };
}

geoAgentReadinessRoutes.openapi(getReadinessRoute, async (c) => {
  const base = c.get("geo");
  const { projectId } = c.req.valid("param");

  const scope = await runGeoEffect(
    "agentReadinessScope",
    requireGeoProject({ organizationId: base.organizationId, projectId })
  );
  if (!scope.ok) {
    return geoErrorResponse(c, scope.failure);
  }

  try {
    const report = await Effect.runPromise(loadAgentReadiness(scope.value));
    return c.json({ ...report, organization: base.organization }, 200);
  } catch (error) {
    const failure = readinessFailure(error);
    if (failure.status === 500) {
      logError("[GEO] agentReadiness", error);
      return c.json({ error: failure.error }, 500);
    }
    return c.json({ error: failure.error }, 400);
  }
});

geoAgentReadinessRoutes.openapi(startScanRoute, async (c) => {
  const base = c.get("geo");
  const { projectId } = c.req.valid("param");

  const scope = await runGeoEffect(
    "agentReadinessScope",
    requireGeoProject({ organizationId: base.organizationId, projectId })
  );
  if (!scope.ok) {
    return geoErrorResponse(c, scope.failure);
  }

  // Charged immediately before the scan starts: rejected requests (unknown
  // project, GEO not enabled) must not spend the hourly budget.
  const rateLimited = await enforceRatelimit(
    c,
    ratelimit.agentReadinessScan,
    "organization"
  );
  if (rateLimited) {
    return rateLimited;
  }

  try {
    const started = await Effect.runPromise(
      startAgentReadinessScan(scope.value).pipe(Effect.provide(geoCoreApiLayer))
    );
    trackApiEvent(c, {
      event: POSTHOG_EVENTS.AGENT_READINESS_SCAN_STARTED,
      organizationId: base.organizationId,
      projectId,
      properties: { trigger: API_TRIGGER_SOURCE },
    });
    return c.json({ ...started, organization: base.organization }, 202);
  } catch (error) {
    const failure = readinessFailure(error);
    if (failure.status === 500) {
      logError("[GEO] agentReadinessScan", error);
      return c.json({ error: failure.error }, 500);
    }
    return c.json({ error: failure.error }, 400);
  }
});
