import { createRoute } from "@hono/zod-openapi";
import {
  loadGeoChanges,
  loadGeoPromptHistory,
} from "@notra/geo-core/geo/programs";
import {
  loadGeoSentiment,
  loadGeoSentimentEvidence,
} from "@notra/geo-core/geo/sentiment";
import { loadStoredGeoSentimentAnalysis } from "@notra/geo-core/geo/sentiment-analysis";
import { geoWindow } from "@notra/geo-core/geo/window";
import { sentimentPeriods } from "@notra/geo-core/utils/sentiment-period";
import {
  geoChangesResponseSchema,
  geoPromptHistoryParamsSchema,
  geoPromptHistoryQuerySchema,
  geoPromptHistoryResponseSchema,
  geoSentimentAnalysisResponseSchema,
  geoSentimentEvidenceQuerySchema,
  geoSentimentEvidenceResponseSchema,
  geoSentimentQuerySchema,
  geoSentimentResponseSchema,
} from "@notra/schemas/api/geo-diagnostics";
import { projectParamsSchema } from "@notra/schemas/api/geo-params";

import {
  GEO_COMMON_ERROR_RESPONSES,
  GEO_OPENAPI_TAG,
} from "../constants/geo-openapi";
import { runGeoEffect } from "../runtime/geo";
import { attachGeoOrganization, geoErrorResponse } from "../utils/geo";
import {
  decodeGeoSentimentCursor,
  encodeGeoSentimentCursor,
} from "../utils/geo-diagnostic-cursor";
import { createOpenApiApp } from "../utils/openapi-app";

export const geoDiagnosticsRoutes = createOpenApiApp();

const GEO_TAG = GEO_OPENAPI_TAG;
const commonErrors = GEO_COMMON_ERROR_RESPONSES;

const changesRoute = createRoute({
  method: "get",
  path: "/projects/{projectId}/geo/changes",
  tags: [GEO_TAG],
  operationId: "listGeoChanges",
  summary: "Compare the two latest GEO scans",
  request: { params: projectParamsSchema },
  responses: {
    200: {
      description: "GEO changes fetched successfully",
      content: { "application/json": { schema: geoChangesResponseSchema } },
    },
    ...commonErrors,
  },
});

const promptHistoryRoute = createRoute({
  method: "get",
  path: "/projects/{projectId}/geo/prompts/{promptId}/history",
  tags: [GEO_TAG],
  operationId: "getGeoPromptHistory",
  summary: "Get the stored check history for one prompt",
  description:
    "Returns compact check rows. Use each check id with the prompt-result detail endpoint for the full answer.",
  request: {
    params: geoPromptHistoryParamsSchema,
    query: geoPromptHistoryQuerySchema,
  },
  responses: {
    200: {
      description: "Prompt history fetched successfully",
      content: {
        "application/json": { schema: geoPromptHistoryResponseSchema },
      },
    },
    ...commonErrors,
  },
});

const sentimentRoute = createRoute({
  method: "get",
  path: "/projects/{projectId}/geo/sentiment",
  tags: [GEO_TAG],
  operationId: "getGeoSentiment",
  summary: "Get aggregate GEO sentiment",
  description:
    "Returns current and previous-period sentiment metrics without starting billed analysis.",
  request: { params: projectParamsSchema, query: geoSentimentQuerySchema },
  responses: {
    200: {
      description: "Sentiment fetched successfully",
      content: { "application/json": { schema: geoSentimentResponseSchema } },
    },
    ...commonErrors,
  },
});

const sentimentAnalysisRoute = createRoute({
  method: "get",
  path: "/projects/{projectId}/geo/sentiment/analysis",
  tags: [GEO_TAG],
  operationId: "getGeoSentimentAnalysis",
  summary: "Get the stored GEO sentiment analysis",
  description:
    "Reads the cached thematic analysis state and never starts a billed model run.",
  request: { params: projectParamsSchema, query: geoSentimentQuerySchema },
  responses: {
    200: {
      description: "Sentiment analysis state fetched successfully",
      content: {
        "application/json": { schema: geoSentimentAnalysisResponseSchema },
      },
    },
    ...commonErrors,
  },
});

const sentimentEvidenceRoute = createRoute({
  method: "get",
  path: "/projects/{projectId}/geo/sentiment/evidence",
  tags: [GEO_TAG],
  operationId: "listGeoSentimentEvidence",
  summary: "List answers used as sentiment evidence",
  request: {
    params: projectParamsSchema,
    query: geoSentimentEvidenceQuerySchema,
  },
  responses: {
    200: {
      description: "Sentiment evidence fetched successfully",
      content: {
        "application/json": { schema: geoSentimentEvidenceResponseSchema },
      },
    },
    ...commonErrors,
  },
});

geoDiagnosticsRoutes.openapi(changesRoute, async (c) => {
  const base = c.get("geo");
  const { projectId } = c.req.valid("param");
  const outcome = await runGeoEffect(
    "changes",
    loadGeoChanges({ organizationId: base.organizationId, projectId })
  );
  if (!outcome.ok) {
    return geoErrorResponse(c, outcome.failure);
  }
  return c.json(attachGeoOrganization(base.organization, outcome.value), 200);
});

geoDiagnosticsRoutes.openapi(promptHistoryRoute, async (c) => {
  const base = c.get("geo");
  const { projectId, promptId } = c.req.valid("param");
  const { scanId } = c.req.valid("query");
  const outcome = await runGeoEffect(
    "promptHistory",
    loadGeoPromptHistory({
      organizationId: base.organizationId,
      projectId,
      promptId,
      scanId,
    })
  );
  if (!outcome.ok) {
    return geoErrorResponse(c, outcome.failure);
  }
  return c.json(attachGeoOrganization(base.organization, outcome.value), 200);
});

geoDiagnosticsRoutes.openapi(sentimentRoute, async (c) => {
  const base = c.get("geo");
  const { projectId } = c.req.valid("param");
  const query = c.req.valid("query");
  const outcome = await runGeoEffect(
    "sentiment",
    loadGeoSentiment(
      { organizationId: base.organizationId, projectId },
      geoWindow(query)
    )
  );
  if (!outcome.ok) {
    return geoErrorResponse(c, outcome.failure);
  }
  return c.json(attachGeoOrganization(base.organization, outcome.value), 200);
});

geoDiagnosticsRoutes.openapi(sentimentAnalysisRoute, async (c) => {
  const base = c.get("geo");
  const { projectId } = c.req.valid("param");
  const query = c.req.valid("query");
  const outcome = await runGeoEffect(
    "sentimentAnalysis",
    loadStoredGeoSentimentAnalysis(
      { organizationId: base.organizationId, projectId },
      geoWindow(query)
    )
  );
  if (!outcome.ok) {
    return geoErrorResponse(c, outcome.failure);
  }
  return c.json(attachGeoOrganization(base.organization, outcome.value), 200);
});

geoDiagnosticsRoutes.openapi(sentimentEvidenceRoute, async (c) => {
  const base = c.get("geo");
  const { projectId } = c.req.valid("param");
  const query = c.req.valid("query");
  const cursorSecret = c.env.INTEGRATION_ENCRYPTION_KEY;
  if (!cursorSecret) {
    return c.json({ error: "Sentiment evidence pagination unavailable" }, 503);
  }
  const cursor = decodeGeoSentimentCursor(query.cursor, cursorSecret);
  const expectedScope = JSON.stringify([
    base.organizationId,
    projectId,
    query.from ?? null,
    query.to ?? null,
    query.days ?? null,
  ]);
  if (query.cursor && (!cursor || cursor.scope !== expectedScope)) {
    return c.json(
      { error: "Cursor does not match the selected project or time window" },
      400
    );
  }
  const evidenceWindow = cursor
    ? { from: cursor.from, to: cursor.to }
    : sentimentPeriods(geoWindow(query)).current;
  const outcome = await runGeoEffect(
    "sentimentEvidence",
    loadGeoSentimentEvidence(
      {
        organizationId: base.organizationId,
        projectId,
        cursor,
        days: query.days,
        from: query.from,
        to: query.to,
      },
      evidenceWindow
    )
  );
  if (!outcome.ok) {
    return geoErrorResponse(c, outcome.failure);
  }
  return c.json(
    attachGeoOrganization(base.organization, {
      items: outcome.value.items,
      nextCursor: encodeGeoSentimentCursor(
        outcome.value.nextCursor,
        evidenceWindow,
        cursorSecret
      ),
    }),
    200
  );
});
