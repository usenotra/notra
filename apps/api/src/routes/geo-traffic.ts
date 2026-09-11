import { createRoute } from "@hono/zod-openapi";
import {
  buildGeoIngestSetupInfo,
  isGeoIngestConfigured,
  issueGeoIngestSetupResponse,
  rotateGeoIngestSetupResponse,
} from "@notra/geo-core/geo/ingest";
import {
  loadAiTraffic,
  loadGeoJourneyDetail,
  loadGeoTrafficJourneys,
  loadGeoTrafficLog,
  loadGeoTrafficPages,
} from "@notra/geo-core/geo/programs";
import { geoWindow } from "@notra/geo-core/geo/window";
import { projectParamsSchema } from "@notra/schemas/api/geo-params";
import {
  ingestSetupResponseSchema,
  ingestTokenQuerySchema,
  ingestTokenResponseSchema,
  journeyDetailResponseSchema,
  journeyParamsSchema,
  trafficJourneysQuerySchema,
  trafficJourneysResponseSchema,
  trafficLogQuerySchema,
  trafficLogResponseSchema,
  trafficOverviewQuerySchema,
  trafficOverviewResponseSchema,
  trafficPagesQuerySchema,
  trafficPagesResponseSchema,
} from "@notra/schemas/api/geo-traffic";

import {
  GEO_COMMON_ERROR_RESPONSES,
  GEO_OPENAPI_TAG,
} from "../constants/geo-openapi";
import { geoErrorResponse } from "../utils/geo";
import { runGeoEffect } from "../utils/geo-effect";
import { logError } from "../utils/logging";
import { createOpenApiApp } from "../utils/openapi-app";

/**
 * AI crawler and referral traffic, plus the tracking token that produces it.
 *
 * The read programs take the same optional-project scope the dashboard passes,
 * so they are mounted per project. The ingest token is not: it identifies an
 * organization (a project is only an optional segment inside it), so setup and
 * rotation sit at `/geo/ingest/*` at the organization level — the same shape
 * the dashboard's `geo.ingestSetup` procedure has.
 *
 * The traffic backend degrades rather than fails. When it is not configured for
 * a deployment, geo-core answers `configured: false` with empty collections,
 * and that is passed through unchanged instead of being turned into an error.
 * The ingest token is different: an empty token is not a usable answer, so a
 * missing signing secret is reported as a 503.
 *
 * The token itself is only ever handed out by POST endpoints. Scope resolution
 * is method-based (GET resolves to `traffic.read`), and the token is a write
 * credential — it lets its holder post events — so a read-only key must not be
 * able to obtain one. `GET /geo/ingest/setup` therefore returns the endpoint
 * and the snippets, which name the token's environment variable rather than its
 * value, and `POST /geo/ingest/token` issues the token itself.
 */
export const geoTrafficRoutes = createOpenApiApp();

const GEO_TAG = GEO_OPENAPI_TAG;
const commonErrors = GEO_COMMON_ERROR_RESPONSES;

const trafficOverviewRoute = createRoute({
  method: "get",
  path: "/projects/{projectId}/geo/traffic/overview",
  tags: [GEO_TAG],
  operationId: "getGeoTrafficOverview",
  summary: "Get AI traffic totals and sources",
  description:
    "Crawler and AI-referral visit totals, a per-source breakdown and the daily timeseries behind it.",
  request: { params: projectParamsSchema, query: trafficOverviewQuerySchema },
  responses: {
    200: {
      description: "Traffic overview fetched successfully",
      content: {
        "application/json": { schema: trafficOverviewResponseSchema },
      },
    },
    ...commonErrors,
  },
});

const trafficLogRoute = createRoute({
  method: "get",
  path: "/projects/{projectId}/geo/traffic/log",
  tags: [GEO_TAG],
  operationId: "getGeoTrafficLog",
  summary: "Get recent AI traffic events",
  description:
    "The most recent individual requests from AI crawlers and referrals. This endpoint has no window; use `limit` to bound it.",
  request: { params: projectParamsSchema, query: trafficLogQuerySchema },
  responses: {
    200: {
      description: "Traffic log fetched successfully",
      content: { "application/json": { schema: trafficLogResponseSchema } },
    },
    ...commonErrors,
  },
});

const trafficJourneysRoute = createRoute({
  method: "get",
  path: "/projects/{projectId}/geo/traffic/journeys",
  tags: [GEO_TAG],
  operationId: "listGeoTrafficJourneys",
  summary: "List AI traffic journeys",
  description:
    "Sessions grouped by journey: how many pages one agent read, over what span, and a sample of the paths.",
  request: { params: projectParamsSchema, query: trafficJourneysQuerySchema },
  responses: {
    200: {
      description: "Journeys fetched successfully",
      content: {
        "application/json": { schema: trafficJourneysResponseSchema },
      },
    },
    ...commonErrors,
  },
});

const journeyDetailRoute = createRoute({
  method: "get",
  path: "/projects/{projectId}/geo/traffic/journeys/{journeyId}",
  tags: [GEO_TAG],
  operationId: "getGeoTrafficJourney",
  summary: "Get one journey's events",
  request: { params: journeyParamsSchema, query: trafficOverviewQuerySchema },
  responses: {
    200: {
      description: "Journey fetched successfully",
      content: { "application/json": { schema: journeyDetailResponseSchema } },
    },
    ...commonErrors,
  },
});

const trafficPagesRoute = createRoute({
  method: "get",
  path: "/projects/{projectId}/geo/traffic/pages",
  tags: [GEO_TAG],
  operationId: "listGeoTrafficPages",
  summary: "List the most visited pages",
  description:
    "Which paths AI crawlers and referrals read most, with the previous window's count for comparison.",
  request: { params: projectParamsSchema, query: trafficPagesQuerySchema },
  responses: {
    200: {
      description: "Pages fetched successfully",
      content: { "application/json": { schema: trafficPagesResponseSchema } },
    },
    ...commonErrors,
  },
});

const ingestSetupRoute = createRoute({
  method: "get",
  path: "/geo/ingest/setup",
  tags: [GEO_TAG],
  operationId: "getGeoIngestSetup",
  summary: "Get the install snippets",
  description:
    "The endpoint and framework snippets needed to send AI traffic to Notra. The snippets read the token from an environment variable; the token itself is issued by `POST /geo/ingest/token`, which requires a write scope.",
  responses: {
    200: {
      description: "Setup fetched successfully",
      content: { "application/json": { schema: ingestSetupResponseSchema } },
    },
    ...commonErrors,
  },
});

const issueTokenRoute = createRoute({
  method: "post",
  path: "/geo/ingest/token",
  tags: [GEO_TAG],
  operationId: "issueGeoIngestToken",
  summary: "Issue the tracking token",
  description:
    "Returns the current tracking token together with the install snippets. Organization-level: pass `projectId` to bind the token to one project. Issuing does not invalidate previously issued tokens; use rotation for that.",
  request: { query: ingestTokenQuerySchema },
  responses: {
    200: {
      description: "Token issued successfully",
      content: { "application/json": { schema: ingestTokenResponseSchema } },
    },
    ...commonErrors,
  },
});

const rotateTokenRoute = createRoute({
  method: "post",
  path: "/geo/ingest/rotate-token",
  tags: [GEO_TAG],
  operationId: "rotateGeoIngestToken",
  summary: "Rotate the tracking token",
  description:
    "Invalidates every tracking token previously issued for this organization and returns a fresh one. Deployments still sending the old token stop being accepted immediately.",
  request: {
    query: ingestTokenQuerySchema,
  },
  responses: {
    200: {
      description: "Token rotated successfully",
      content: { "application/json": { schema: ingestTokenResponseSchema } },
    },
    ...commonErrors,
  },
});

geoTrafficRoutes.openapi(trafficOverviewRoute, async (c) => {
  const base = c.get("geo");
  const { projectId } = c.req.valid("param");

  const outcome = await runGeoEffect(
    "aiTraffic",
    loadAiTraffic(
      { organizationId: base.organizationId, projectId },
      geoWindow(c.req.valid("query"))
    )
  );
  if (!outcome.ok) {
    return geoErrorResponse(c, outcome.failure);
  }

  return c.json({ ...outcome.value, organization: base.organization }, 200);
});

geoTrafficRoutes.openapi(trafficLogRoute, async (c) => {
  const base = c.get("geo");
  const { projectId } = c.req.valid("param");

  const { limit, visitorTypes, categories } = c.req.valid("query");
  const outcome = await runGeoEffect(
    "trafficLog",
    loadGeoTrafficLog(
      { organizationId: base.organizationId, projectId },
      limit,
      visitorTypes,
      categories
    )
  );
  if (!outcome.ok) {
    return geoErrorResponse(c, outcome.failure);
  }

  return c.json({ ...outcome.value, organization: base.organization }, 200);
});

geoTrafficRoutes.openapi(trafficJourneysRoute, async (c) => {
  const base = c.get("geo");
  const { projectId } = c.req.valid("param");

  const query = c.req.valid("query");
  const outcome = await runGeoEffect(
    "trafficJourneys",
    loadGeoTrafficJourneys(
      { organizationId: base.organizationId, projectId },
      geoWindow(query),
      query.limit
    )
  );
  if (!outcome.ok) {
    return geoErrorResponse(c, outcome.failure);
  }

  return c.json({ ...outcome.value, organization: base.organization }, 200);
});

geoTrafficRoutes.openapi(journeyDetailRoute, async (c) => {
  const base = c.get("geo");
  const { projectId, journeyId } = c.req.valid("param");

  const outcome = await runGeoEffect(
    "journeyDetail",
    loadGeoJourneyDetail(
      { organizationId: base.organizationId, projectId },
      journeyId,
      geoWindow(c.req.valid("query"))
    )
  );
  if (!outcome.ok) {
    return geoErrorResponse(c, outcome.failure);
  }

  return c.json({ ...outcome.value, organization: base.organization }, 200);
});

geoTrafficRoutes.openapi(trafficPagesRoute, async (c) => {
  const base = c.get("geo");
  const { projectId } = c.req.valid("param");

  const query = c.req.valid("query");
  const outcome = await runGeoEffect(
    "trafficPages",
    loadGeoTrafficPages(
      { organizationId: base.organizationId, projectId },
      geoWindow(query),
      query.limit,
      query.visitorType
    )
  );
  if (!outcome.ok) {
    return geoErrorResponse(c, outcome.failure);
  }

  return c.json({ ...outcome.value, organization: base.organization }, 200);
});

geoTrafficRoutes.openapi(ingestSetupRoute, async (c) => {
  const base = c.get("geo");
  if (!isGeoIngestConfigured()) {
    return c.json({ error: "Traffic ingest is not configured" }, 503);
  }

  try {
    return c.json(
      { ...buildGeoIngestSetupInfo(), organization: base.organization },
      200
    );
  } catch (error) {
    logError("[GEO] ingestSetup", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

geoTrafficRoutes.openapi(issueTokenRoute, async (c) => {
  const base = c.get("geo");
  const { projectId } = c.req.valid("query");
  const outcome = await runGeoEffect(
    "ingestTokenIssue",
    issueGeoIngestSetupResponse({
      organizationId: base.organizationId,
      projectId,
    })
  );
  if (!outcome.ok) {
    return geoErrorResponse(c, outcome.failure);
  }
  if (!outcome.value) {
    return c.json({ error: "Organization not found" }, 404);
  }
  if (!outcome.value.token) {
    return c.json({ error: "Traffic ingest is not configured" }, 503);
  }
  return c.json({ ...outcome.value, organization: base.organization }, 200);
});

geoTrafficRoutes.openapi(rotateTokenRoute, async (c) => {
  const base = c.get("geo");
  const { projectId } = c.req.valid("query");
  const outcome = await runGeoEffect(
    "ingestTokenRotate",
    rotateGeoIngestSetupResponse({
      organizationId: base.organizationId,
      projectId,
    })
  );
  if (!outcome.ok) {
    return geoErrorResponse(c, outcome.failure);
  }
  if (!outcome.value) {
    return c.json({ error: "Organization not found" }, 404);
  }
  if (!outcome.value.token) {
    return c.json({ error: "Traffic ingest is not configured" }, 503);
  }
  return c.json({ ...outcome.value, organization: base.organization }, 200);
});
