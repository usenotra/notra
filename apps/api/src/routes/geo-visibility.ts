import { createRoute } from "@hono/zod-openapi";
import {
  loadGeoCompetitorDetail,
  loadGeoCompetitorShare,
  loadGeoLanguageShare,
  loadGeoOverview,
  loadGeoPromptResults,
  loadGeoTimeseries,
} from "@notra/geo-core/geo/programs";
import { geoWindow } from "@notra/geo-core/geo/window";
import { projectParamsSchema } from "@notra/schemas/api/geo-params";
import {
  competitorDetailParamsSchema,
  geoWindowQuerySchema,
  visibilityCompetitorDetailResponseSchema,
  visibilityCompetitorShareResponseSchema,
  visibilityLanguageShareResponseSchema,
  visibilityOverviewResponseSchema,
  visibilityPromptResultsResponseSchema,
  visibilityTimeseriesResponseSchema,
} from "@notra/schemas/api/geo-visibility";

import {
  GEO_COMMON_ERROR_RESPONSES,
  GEO_OPENAPI_TAG,
} from "../constants/geo-openapi";
import { geoErrorResponse } from "../utils/geo";
import { runGeoEffect } from "../utils/geo-effect";
import { createOpenApiApp } from "../utils/openapi-app";

/**
 * Visibility reads.
 *
 * Every operation here is a GET, so only `visibility.read` is ever required —
 * the registry defines the write scope for symmetry but no route grants it.
 *
 * Each handler re-checks that the project belongs to the caller's organization
 * before running the program. That is not redundant with `resolveGeoScope`:
 * when that program cannot match the id it silently falls back to the
 * organization's oldest project, which would answer for the wrong project
 * instead of 404ing.
 */
export const geoVisibilityRoutes = createOpenApiApp();

const GEO_TAG = GEO_OPENAPI_TAG;
const commonErrors = GEO_COMMON_ERROR_RESPONSES;

const WINDOW_NOTE =
  "Pass `days` for a rolling window, or `from`/`to` for an explicit one.";

const overviewRoute = createRoute({
  method: "get",
  path: "/projects/{projectId}/geo/visibility/overview",
  tags: [GEO_TAG],
  operationId: "getGeoVisibilityOverview",
  summary: "Get mention rates per engine",
  description: `Checks, mentions and average position for every answer engine the project tracks. ${WINDOW_NOTE}`,
  request: { params: projectParamsSchema, query: geoWindowQuerySchema },
  responses: {
    200: {
      description: "Overview fetched successfully",
      content: {
        "application/json": { schema: visibilityOverviewResponseSchema },
      },
    },
    ...commonErrors,
  },
});

const timeseriesRoute = createRoute({
  method: "get",
  path: "/projects/{projectId}/geo/visibility/timeseries",
  tags: [GEO_TAG],
  operationId: "getGeoVisibilityTimeseries",
  summary: "Get daily mention counts per engine",
  description: `One point per day and engine. ${WINDOW_NOTE}`,
  request: { params: projectParamsSchema, query: geoWindowQuerySchema },
  responses: {
    200: {
      description: "Timeseries fetched successfully",
      content: {
        "application/json": { schema: visibilityTimeseriesResponseSchema },
      },
    },
    ...commonErrors,
  },
});

const promptResultsRoute = createRoute({
  method: "get",
  path: "/projects/{projectId}/geo/visibility/prompt-results",
  tags: [GEO_TAG],
  operationId: "getGeoVisibilityPromptResults",
  summary: "Get the latest answer per prompt and engine",
  description: `The stored answer text, mention position, sentiment and grounding sources for each tracked prompt. ${WINDOW_NOTE}`,
  request: { params: projectParamsSchema, query: geoWindowQuerySchema },
  responses: {
    200: {
      description: "Prompt results fetched successfully",
      content: {
        "application/json": { schema: visibilityPromptResultsResponseSchema },
      },
    },
    ...commonErrors,
  },
});

const competitorShareRoute = createRoute({
  method: "get",
  path: "/projects/{projectId}/geo/visibility/competitor-share",
  tags: [GEO_TAG],
  operationId: "getGeoVisibilityCompetitorShare",
  summary: "Get share of voice across tracked brands",
  description: `Mention counts per brand with a per-brand trend, plus the daily timeseries behind it. ${WINDOW_NOTE}`,
  request: { params: projectParamsSchema, query: geoWindowQuerySchema },
  responses: {
    200: {
      description: "Competitor share fetched successfully",
      content: {
        "application/json": { schema: visibilityCompetitorShareResponseSchema },
      },
    },
    ...commonErrors,
  },
});

const languageShareRoute = createRoute({
  method: "get",
  path: "/projects/{projectId}/geo/visibility/language-share",
  tags: [GEO_TAG],
  operationId: "getGeoVisibilityLanguageShare",
  summary: "Get mention rates per tracked language",
  description: `Checks, mentions and average position broken down by language. ${WINDOW_NOTE}`,
  request: { params: projectParamsSchema, query: geoWindowQuerySchema },
  responses: {
    200: {
      description: "Language share fetched successfully",
      content: {
        "application/json": { schema: visibilityLanguageShareResponseSchema },
      },
    },
    ...commonErrors,
  },
});

const competitorDetailRoute = createRoute({
  method: "get",
  path: "/projects/{projectId}/geo/visibility/competitors/{brand}",
  tags: [GEO_TAG],
  operationId: "getGeoVisibilityCompetitorDetail",
  summary: "Get one competitor's mention history",
  description:
    "Daily mentions and the prompts that produced them for a single brand. Without a window this falls back to the competitor-detail default rather than the project default, matching the dashboard.",
  request: {
    params: competitorDetailParamsSchema,
    query: geoWindowQuerySchema,
  },
  responses: {
    200: {
      description: "Competitor detail fetched successfully",
      content: {
        "application/json": {
          schema: visibilityCompetitorDetailResponseSchema,
        },
      },
    },
    ...commonErrors,
  },
});

geoVisibilityRoutes.openapi(overviewRoute, async (c) => {
  const base = c.get("geo");
  const { projectId } = c.req.valid("param");
  const outcome = await runGeoEffect(
    "overview",
    loadGeoOverview(
      { organizationId: base.organizationId, projectId },
      geoWindow(c.req.valid("query"))
    )
  );
  if (!outcome.ok) {
    return geoErrorResponse(c, outcome.failure);
  }

  return c.json({ ...outcome.value, organization: base.organization }, 200);
});

geoVisibilityRoutes.openapi(timeseriesRoute, async (c) => {
  const base = c.get("geo");
  const { projectId } = c.req.valid("param");
  const outcome = await runGeoEffect(
    "timeseries",
    loadGeoTimeseries(
      { organizationId: base.organizationId, projectId },
      geoWindow(c.req.valid("query"))
    )
  );
  if (!outcome.ok) {
    return geoErrorResponse(c, outcome.failure);
  }

  return c.json({ ...outcome.value, organization: base.organization }, 200);
});

geoVisibilityRoutes.openapi(promptResultsRoute, async (c) => {
  const base = c.get("geo");
  const { projectId } = c.req.valid("param");
  const outcome = await runGeoEffect(
    "promptResults",
    loadGeoPromptResults(
      { organizationId: base.organizationId, projectId },
      geoWindow(c.req.valid("query"))
    )
  );
  if (!outcome.ok) {
    return geoErrorResponse(c, outcome.failure);
  }

  const results = outcome.value.results.map((result) => ({
    promptId: result.promptId,
    engine: result.engine,
    prompt: result.prompt,
    answer: result.answer,
    mentioned: result.mentioned,
    position: result.position,
    sentiment: result.sentiment,
    competitors: result.competitors,
    excerpt: result.excerpt,
    searchQueries: result.searchQueries,
    sources: result.sources,
    lastCheckedAt: result.lastCheckedAt,
  }));
  return c.json(
    {
      configured: outcome.value.configured,
      results,
      organization: base.organization,
    },
    200
  );
});

geoVisibilityRoutes.openapi(competitorShareRoute, async (c) => {
  const base = c.get("geo");
  const { projectId } = c.req.valid("param");
  const outcome = await runGeoEffect(
    "competitorShare",
    loadGeoCompetitorShare(
      { organizationId: base.organizationId, projectId },
      geoWindow(c.req.valid("query"))
    )
  );
  if (!outcome.ok) {
    return geoErrorResponse(c, outcome.failure);
  }

  return c.json({ ...outcome.value, organization: base.organization }, 200);
});

geoVisibilityRoutes.openapi(languageShareRoute, async (c) => {
  const base = c.get("geo");
  const { projectId } = c.req.valid("param");
  const outcome = await runGeoEffect(
    "languageShare",
    loadGeoLanguageShare(
      { organizationId: base.organizationId, projectId },
      geoWindow(c.req.valid("query"))
    )
  );
  if (!outcome.ok) {
    return geoErrorResponse(c, outcome.failure);
  }

  return c.json({ ...outcome.value, organization: base.organization }, 200);
});

geoVisibilityRoutes.openapi(competitorDetailRoute, async (c) => {
  const base = c.get("geo");
  const { projectId, brand } = c.req.valid("param");
  const outcome = await runGeoEffect(
    "competitorDetail",
    loadGeoCompetitorDetail(
      { organizationId: base.organizationId, projectId },
      brand,
      geoWindow(c.req.valid("query"))
    )
  );
  if (!outcome.ok) {
    return geoErrorResponse(c, outcome.failure);
  }

  return c.json({ ...outcome.value, organization: base.organization }, 200);
});
