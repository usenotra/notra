import { createRoute } from "@hono/zod-openapi";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import {
  agentReadinessResponseSchema,
  agentReadinessScanResponseSchema,
} from "@notra/schemas/api/geo-agent-readiness";
import { projectParamsSchema } from "@notra/schemas/api/geo-params";

import { API_TRIGGER_SOURCE } from "../constants/analytics";
import {
  GEO_COMMON_ERROR_RESPONSES,
  GEO_OPENAPI_TAG,
} from "../constants/geo-openapi";
import {
  getGeoAgentReadiness,
  startGeoAgentReadinessScanForProject,
} from "../programs/geo";
import { runGeoEffect } from "../runtime/geo";
import { trackApiEvent } from "../utils/analytics";
import { attachGeoOrganization, geoErrorResponse } from "../utils/geo";
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

geoAgentReadinessRoutes.openapi(getReadinessRoute, async (c) => {
  const base = c.get("geo");
  const { projectId } = c.req.valid("param");

  const outcome = await runGeoEffect(
    "agentReadiness",
    getGeoAgentReadiness({ organizationId: base.organizationId, projectId })
  );
  if (!outcome.ok) {
    return geoErrorResponse(c, outcome.failure);
  }

  return c.json(attachGeoOrganization(base.organization, outcome.value), 200);
});

geoAgentReadinessRoutes.openapi(startScanRoute, async (c) => {
  const base = c.get("geo");
  const { projectId } = c.req.valid("param");

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

  const outcome = await runGeoEffect(
    "agentReadinessScan",
    startGeoAgentReadinessScanForProject({
      organizationId: base.organizationId,
      projectId,
    })
  );
  if (!outcome.ok) {
    return geoErrorResponse(c, outcome.failure);
  }

  trackApiEvent(c, {
    event: POSTHOG_EVENTS.AGENT_READINESS_SCAN_STARTED,
    organizationId: base.organizationId,
    projectId,
    properties: { trigger: API_TRIGGER_SOURCE },
  });
  return c.json(attachGeoOrganization(base.organization, outcome.value), 202);
});
