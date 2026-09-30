import { createRoute } from "@hono/zod-openapi";
import {
  loadGeoCompetitorDetail,
  loadGeoCompetitorShare,
  loadGeoLanguageShare,
  loadGeoOverview,
  loadGeoPromptResults,
  loadGeoTimeseries,
} from "@notra/geo-core/geo/programs";
import {
  loadGeoPromptResultDetail,
  loadGeoPromptResultSummaries,
} from "@notra/geo-core/geo/prompt-results";
import { geoWindow } from "@notra/geo-core/geo/window";
import { projectParamsSchema } from "@notra/schemas/api/geo-params";
import {
  competitorDetailParamsSchema,
  geoWindowQuerySchema,
  promptResultDetailParamsSchema,
  promptResultSummaryQuerySchema,
  visibilityCompetitorDetailResponseSchema,
  visibilityCompetitorShareResponseSchema,
  visibilityLanguageShareResponseSchema,
  visibilityOverviewResponseSchema,
  visibilityPromptResultDetailResponseSchema,
  visibilityPromptResultSummariesResponseSchema,
  visibilityPromptResultsResponseSchema,
  visibilityTimeseriesResponseSchema,
} from "@notra/schemas/api/geo-visibility";

import {
  GEO_COMMON_ERROR_RESPONSES,
  GEO_OPENAPI_TAG,
} from "../constants/geo-openapi";
import { runGeoEffect } from "../runtime/geo";
import { attachGeoOrganization, geoErrorResponse } from "../utils/geo";
import {
  normalizeLanguageShareResponse,
  normalizeOverviewResponse,
  normalizePromptResultsResponse,
  normalizeTimeseriesResponse,
} from "../utils/geo-visibility";
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

const promptResultSummariesRoute = createRoute({
  method: "get",
  path: "/projects/{projectId}/geo/visibility/prompt-results/summaries",
  tags: [GEO_TAG],
  operationId: "listGeoPromptResultSummaries",
  summary: "List compact prompt result summaries",
  description:
    "A filtered, paginated projection of the latest answer per prompt and engine. Full answer text and sources are omitted; use checkId with the detail endpoint.",
  request: {
    params: projectParamsSchema,
    query: promptResultSummaryQuerySchema,
  },
  responses: {
    200: {
      description: "Prompt result summaries fetched successfully",
      content: {
        "application/json": {
          schema: visibilityPromptResultSummariesResponseSchema,
        },
      },
    },
    ...commonErrors,
  },
});

const promptResultDetailRoute = createRoute({
  method: "get",
  path: "/projects/{projectId}/geo/visibility/prompt-results/{checkId}",
  tags: [GEO_TAG],
  operationId: "getGeoPromptResultDetail",
  summary: "Get one full prompt result",
  description:
    "Loads the answer, grounding sources and token metadata for one checkId returned by the summaries or prompt-history endpoints.",
  request: { params: promptResultDetailParamsSchema },
  responses: {
    200: {
      description: "Prompt result fetched successfully",
      content: {
        "application/json": {
          schema: visibilityPromptResultDetailResponseSchema,
        },
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

  return c.json(
    attachGeoOrganization(
      base.organization,
      normalizeOverviewResponse(outcome.value)
    ),
    200
  );
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

  return c.json(
    attachGeoOrganization(
      base.organization,
      normalizeTimeseriesResponse(outcome.value)
    ),
    200
  );
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

  return c.json(
    attachGeoOrganization(
      base.organization,
      normalizePromptResultsResponse(outcome.value)
    ),
    200
  );
});

geoVisibilityRoutes.openapi(promptResultSummariesRoute, async (c) => {
  const base = c.get("geo");
  const { projectId } = c.req.valid("param");
  const query = c.req.valid("query");
  const outcome = await runGeoEffect(
    "promptResultSummaries",
    loadGeoPromptResultSummaries(
      { organizationId: base.organizationId, projectId },
      geoWindow(query),
      {
        offset: query.cursor ?? 0,
        limit: query.limit,
        engine: query.engine,
        mentioned: query.mentioned,
        query: query.query,
      }
    )
  );
  if (!outcome.ok) {
    return geoErrorResponse(c, outcome.failure);
  }

  return c.json(
    attachGeoOrganization(base.organization, {
      configured: outcome.value.configured,
      results: outcome.value.results.map((result) => ({
        ...result,
        ownedSourceCited: result.ownedSourceCited ?? false,
      })),
      nextCursor: outcome.value.nextCursor ?? null,
    }),
    200
  );
});

geoVisibilityRoutes.openapi(promptResultDetailRoute, async (c) => {
  const base = c.get("geo");
  const { projectId, checkId } = c.req.valid("param");
  const outcome = await runGeoEffect(
    "promptResultDetail",
    loadGeoPromptResultDetail({
      organizationId: base.organizationId,
      projectId,
      checkId,
    })
  );
  if (!outcome.ok) {
    return geoErrorResponse(c, outcome.failure);
  }
  if (!outcome.value.result) {
    return c.json({ error: "Prompt result not found" }, 404);
  }

  return c.json(
    attachGeoOrganization(base.organization, {
      result: {
        ...outcome.value.result,
        ownedSourceCited: outcome.value.result.ownedSourceCited ?? false,
      },
    }),
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

  return c.json(attachGeoOrganization(base.organization, outcome.value), 200);
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

  return c.json(
    attachGeoOrganization(
      base.organization,
      normalizeLanguageShareResponse(outcome.value)
    ),
    200
  );
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

  return c.json(attachGeoOrganization(base.organization, outcome.value), 200);
});
