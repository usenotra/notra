import { createRoute } from "@hono/zod-openapi";
import { GEO_DOMAIN_REGEX } from "@notra/geo-core/constants/geo";
import { parseCompetitorsCsv } from "@notra/geo-core/geo/csv-import";
import { normalizeCompetitorDomain } from "@notra/geo-core/geo/domain";
import { suggestGeoCompetitors } from "@notra/geo-core/geo/onboarding";
import {
  deleteGeoCompetitor,
  importGeoCompetitors,
  loadGeoCompetitors,
  upsertGeoCompetitor,
} from "@notra/geo-core/geo/programs";
import type { GeoCompetitorImportRow } from "@notra/geo-core/types/geo-import";
import {
  competitorSuggestionsQuerySchema,
  competitorSuggestionsResponseSchema,
  importCompetitorsRequestSchema,
  importCompetitorsResponseSchema,
  listCompetitorsResponseSchema,
  putCompetitorRequestSchema,
} from "@notra/schemas/api/geo-competitors";
import {
  competitorParamsSchema,
  projectParamsSchema,
} from "@notra/schemas/api/geo-params";

import {
  GEO_COMMON_ERROR_RESPONSES,
  GEO_OPENAPI_TAG,
} from "../constants/geo-openapi";
import { geoErrorResponse } from "../utils/geo";
import { runGeoEffect } from "../utils/geo-effect";
import { createOpenApiApp } from "../utils/openapi-app";
import { rateLimitResponse } from "../utils/openapi-responses";
import { enforceRatelimit, RATE_LIMITS, ratelimit } from "../utils/ratelimit";

export const geoCompetitorsRoutes = createOpenApiApp();

const GEO_TAG = GEO_OPENAPI_TAG;
const commonErrors = GEO_COMMON_ERROR_RESPONSES;

const listCompetitorsRoute = createRoute({
  method: "get",
  path: "/projects/{projectId}/geo/competitors",
  tags: [GEO_TAG],
  operationId: "listGeoCompetitors",
  summary: "List tracked GEO competitors",
  request: { params: projectParamsSchema },
  responses: {
    200: {
      description: "Competitors fetched successfully",
      content: {
        "application/json": { schema: listCompetitorsResponseSchema },
      },
    },
    ...commonErrors,
  },
});

const putCompetitorRoute = createRoute({
  method: "put",
  path: "/projects/{projectId}/geo/competitors",
  tags: [GEO_TAG],
  operationId: "upsertGeoCompetitor",
  summary: "Create or update a tracked GEO competitor",
  description:
    "Matches on name, case-insensitively. Send `previousName` to rename an existing competitor. Returns the full competitor list.",
  request: {
    params: projectParamsSchema,
    body: {
      required: true,
      content: { "application/json": { schema: putCompetitorRequestSchema } },
    },
  },
  responses: {
    200: {
      description: "Competitor saved successfully",
      content: {
        "application/json": { schema: listCompetitorsResponseSchema },
      },
    },
    ...commonErrors,
  },
});

const suggestCompetitorsRoute = createRoute({
  method: "get",
  path: "/projects/{projectId}/geo/competitors/suggestions",
  tags: [GEO_TAG],
  operationId: "suggestGeoCompetitors",
  summary: "Suggest GEO competitors for a domain",
  description:
    "Discovers likely competitors for a website. Results are cached per organization and domain.",
  request: {
    params: projectParamsSchema,
    query: competitorSuggestionsQuerySchema,
  },
  responses: {
    200: {
      description: "Competitor suggestions fetched successfully",
      content: {
        "application/json": { schema: competitorSuggestionsResponseSchema },
      },
    },
    ...commonErrors,
    429: rateLimitResponse(
      RATE_LIMITS.competitorSuggestions.requests,
      RATE_LIMITS.competitorSuggestions.window
    ),
  },
});

const deleteCompetitorRoute = createRoute({
  method: "delete",
  path: "/projects/{projectId}/geo/competitors/{name}",
  tags: [GEO_TAG],
  operationId: "deleteGeoCompetitor",
  summary: "Stop tracking a GEO competitor",
  request: { params: competitorParamsSchema },
  responses: {
    200: {
      description: "Competitor deleted successfully",
      content: {
        "application/json": { schema: listCompetitorsResponseSchema },
      },
    },
    ...commonErrors,
  },
});

const importCompetitorsRoute = createRoute({
  method: "post",
  path: "/projects/{projectId}/geo/competitors/import",
  tags: [GEO_TAG],
  operationId: "importGeoCompetitors",
  summary: "Bulk import GEO competitors",
  description:
    "Accepts either structured `rows` or raw `csv` text. Existing competitors are updated in place rather than duplicated.",
  request: {
    params: projectParamsSchema,
    body: {
      required: true,
      content: {
        "application/json": { schema: importCompetitorsRequestSchema },
      },
    },
  },
  responses: {
    200: {
      description: "Competitors imported successfully",
      content: {
        "application/json": { schema: importCompetitorsResponseSchema },
      },
    },
    ...commonErrors,
    429: rateLimitResponse(
      RATE_LIMITS.competitorImport.requests,
      RATE_LIMITS.competitorImport.window
    ),
  },
});

geoCompetitorsRoutes.openapi(listCompetitorsRoute, async (c) => {
  const base = c.get("geo");
  const { projectId } = c.req.valid("param");
  const outcome = await runGeoEffect(
    "competitors",
    loadGeoCompetitors({ organizationId: base.organizationId, projectId })
  );
  if (!outcome.ok) {
    return geoErrorResponse(c, outcome.failure);
  }

  return c.json(
    { competitors: outcome.value.competitors, organization: base.organization },
    200
  );
});

geoCompetitorsRoutes.openapi(putCompetitorRoute, async (c) => {
  const base = c.get("geo");
  const { projectId } = c.req.valid("param");
  const body = c.req.valid("json");
  const outcome = await runGeoEffect(
    "competitorUpsert",
    upsertGeoCompetitor(
      { organizationId: base.organizationId, projectId },
      {
        name: body.name,
        previousName: body.previousName,
        domain: body.domain,
        synonyms: body.synonyms,
        kind: body.kind,
        color: body.color,
      }
    )
  );
  if (!outcome.ok) {
    return geoErrorResponse(c, outcome.failure);
  }

  return c.json(
    { competitors: outcome.value.competitors, organization: base.organization },
    200
  );
});

geoCompetitorsRoutes.openapi(suggestCompetitorsRoute, async (c) => {
  const base = c.get("geo");
  const { projectId } = c.req.valid("param");

  const domain = normalizeCompetitorDomain(c.req.valid("query").domain);
  if (!domain || !GEO_DOMAIN_REGEX.test(domain)) {
    return c.json({ error: "Enter a domain like example.com" }, 400);
  }

  const rateLimited = await enforceRatelimit(
    c,
    ratelimit.competitorSuggestions,
    "organization"
  );
  if (rateLimited) {
    return rateLimited;
  }

  const outcome = await runGeoEffect(
    "competitorSuggestions",
    suggestGeoCompetitors(
      { organizationId: base.organizationId, projectId },
      domain
    )
  );
  if (!outcome.ok) {
    return geoErrorResponse(c, outcome.failure);
  }

  return c.json({ ...outcome.value, organization: base.organization }, 200);
});

geoCompetitorsRoutes.openapi(deleteCompetitorRoute, async (c) => {
  const base = c.get("geo");
  const { projectId, name } = c.req.valid("param");
  const outcome = await runGeoEffect(
    "competitorDelete",
    deleteGeoCompetitor(
      { organizationId: base.organizationId, projectId },
      name
    )
  );
  if (!outcome.ok) {
    return geoErrorResponse(c, outcome.failure);
  }

  return c.json(
    { competitors: outcome.value.competitors, organization: base.organization },
    200
  );
});

geoCompetitorsRoutes.openapi(importCompetitorsRoute, async (c) => {
  const base = c.get("geo");
  const { projectId } = c.req.valid("param");
  const body = c.req.valid("json");

  let rows: readonly GeoCompetitorImportRow[] = body.rows ?? [];
  let issues: { line: number; message: string }[] = [];
  if (!body.rows && body.csv) {
    const parsed = parseCompetitorsCsv(body.csv);
    rows = parsed.rows;
    issues = parsed.issues;
    if (rows.length === 0) {
      return c.json(
        {
          error:
            issues[0]?.message ??
            "No importable competitors found in the CSV text",
        },
        400
      );
    }
  }

  // Charged only once the payload is known to contain importable rows, so a
  // caller fixing a malformed CSV does not spend the import budget on 400s.
  const rateLimited = await enforceRatelimit(
    c,
    ratelimit.competitorImport,
    "organization"
  );
  if (rateLimited) {
    return rateLimited;
  }

  const outcome = await runGeoEffect(
    "competitorsImport",
    importGeoCompetitors(
      { organizationId: base.organizationId, projectId },
      rows
    )
  );
  if (!outcome.ok) {
    return geoErrorResponse(c, outcome.failure);
  }

  return c.json(
    {
      imported: outcome.value.imported,
      updated: outcome.value.updated,
      skipped: outcome.value.skipped,
      issues,
      competitors: outcome.value.competitors,
      organization: base.organization,
    },
    200
  );
});
