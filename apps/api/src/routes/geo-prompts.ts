import { createRoute } from "@hono/zod-openapi";
import { parsePromptsCsv } from "@notra/geo-core/geo/csv-import";
import {
  createGeoPrompt,
  deleteGeoPrompt,
  importGeoPrompts,
  listGeoPrompts,
  updateGeoPrompt,
} from "@notra/geo-core/geo/programs";
import type { GeoPromptImportRow } from "@notra/geo-core/types/geo-import";
import {
  projectParamsSchema,
  promptParamsSchema,
} from "@notra/schemas/api/geo-params";
import {
  createPromptRequestSchema,
  deletePromptResponseSchema,
  importPromptsRequestSchema,
  importPromptsResponseSchema,
  listPromptsResponseSchema,
  patchPromptRequestSchema,
  promptResponseSchema,
} from "@notra/schemas/api/geo-prompts";

import {
  GEO_COMMON_ERROR_RESPONSES,
  GEO_OPENAPI_TAG,
} from "../constants/geo-openapi";
import { geoErrorResponse } from "../utils/geo";
import { runGeoEffect } from "../utils/geo-effect";
import { createOpenApiApp } from "../utils/openapi-app";
import { rateLimitResponse } from "../utils/openapi-responses";
import { enforceRatelimit, RATE_LIMITS, ratelimit } from "../utils/ratelimit";

export const geoPromptsRoutes = createOpenApiApp();

const GEO_TAG = GEO_OPENAPI_TAG;
const commonErrors = GEO_COMMON_ERROR_RESPONSES;

const listPromptsRoute = createRoute({
  method: "get",
  path: "/projects/{projectId}/geo/prompts",
  tags: [GEO_TAG],
  operationId: "listGeoPrompts",
  summary: "List tracked GEO prompts",
  description:
    "Returns custom prompts alongside the prompts derived automatically from the project's brand context.",
  request: { params: projectParamsSchema },
  responses: {
    200: {
      description: "Prompts fetched successfully",
      content: { "application/json": { schema: listPromptsResponseSchema } },
    },
    ...commonErrors,
  },
});

const createPromptRoute = createRoute({
  method: "post",
  path: "/projects/{projectId}/geo/prompts",
  tags: [GEO_TAG],
  operationId: "createGeoPrompt",
  summary: "Track a new GEO prompt",
  request: {
    params: projectParamsSchema,
    body: {
      required: true,
      content: { "application/json": { schema: createPromptRequestSchema } },
    },
  },
  responses: {
    201: {
      description: "Prompt created successfully",
      content: { "application/json": { schema: promptResponseSchema } },
    },
    ...commonErrors,
  },
});

const patchPromptRoute = createRoute({
  method: "patch",
  path: "/projects/{projectId}/geo/prompts/{promptId}",
  tags: [GEO_TAG],
  operationId: "updateGeoPrompt",
  summary: "Update a tracked GEO prompt",
  description:
    "Enable or disable a tracked prompt, or replace tags on a custom prompt.",
  request: {
    params: promptParamsSchema,
    body: {
      required: true,
      content: { "application/json": { schema: patchPromptRequestSchema } },
    },
  },
  responses: {
    200: {
      description: "Prompt updated successfully",
      content: { "application/json": { schema: promptResponseSchema } },
    },
    ...commonErrors,
  },
});

const deletePromptRoute = createRoute({
  method: "delete",
  path: "/projects/{projectId}/geo/prompts/{promptId}",
  tags: [GEO_TAG],
  operationId: "deleteGeoPrompt",
  summary: "Stop tracking a GEO prompt",
  request: { params: promptParamsSchema },
  responses: {
    200: {
      description: "Prompt deleted successfully",
      content: { "application/json": { schema: deletePromptResponseSchema } },
    },
    ...commonErrors,
  },
});

const importPromptsRoute = createRoute({
  method: "post",
  path: "/projects/{projectId}/geo/prompts/import",
  tags: [GEO_TAG],
  operationId: "importGeoPrompts",
  summary: "Bulk import GEO prompts",
  description:
    "Accepts either structured `rows` or raw `csv` text. Prompts that already exist are skipped, not duplicated.",
  request: {
    params: projectParamsSchema,
    body: {
      required: true,
      content: { "application/json": { schema: importPromptsRequestSchema } },
    },
  },
  responses: {
    200: {
      description: "Prompts imported successfully",
      content: { "application/json": { schema: importPromptsResponseSchema } },
    },
    ...commonErrors,
    429: rateLimitResponse(
      RATE_LIMITS.promptImport.requests,
      RATE_LIMITS.promptImport.window
    ),
  },
});

geoPromptsRoutes.openapi(listPromptsRoute, async (c) => {
  const base = c.get("geo");
  const { projectId } = c.req.valid("param");
  const outcome = await runGeoEffect(
    "promptsList",
    listGeoPrompts({ organizationId: base.organizationId, projectId })
  );
  if (!outcome.ok) {
    return geoErrorResponse(c, outcome.failure);
  }

  return c.json(
    {
      configured: outcome.value.configured,
      prompts: outcome.value.prompts,
      organization: base.organization,
    },
    200
  );
});

geoPromptsRoutes.openapi(createPromptRoute, async (c) => {
  const base = c.get("geo");
  const { projectId } = c.req.valid("param");
  const { prompt, tags } = c.req.valid("json");
  const outcome = await runGeoEffect(
    "promptsCreate",
    createGeoPrompt(
      { organizationId: base.organizationId, projectId },
      prompt,
      undefined,
      tags ?? []
    )
  );
  if (!outcome.ok) {
    return geoErrorResponse(c, outcome.failure);
  }

  return c.json(
    { prompt: outcome.value, organization: base.organization },
    201
  );
});

geoPromptsRoutes.openapi(patchPromptRoute, async (c) => {
  const base = c.get("geo");
  const { projectId, promptId } = c.req.valid("param");
  const { enabled, tags } = c.req.valid("json");

  const outcome = await runGeoEffect(
    "promptsUpdate",
    updateGeoPrompt(
      { organizationId: base.organizationId, projectId },
      promptId,
      { enabled, tags }
    )
  );
  if (!outcome.ok) {
    return geoErrorResponse(c, outcome.failure);
  }

  return c.json(
    { prompt: outcome.value, organization: base.organization },
    200
  );
});

geoPromptsRoutes.openapi(deletePromptRoute, async (c) => {
  const base = c.get("geo");
  const { projectId, promptId } = c.req.valid("param");

  const outcome = await runGeoEffect(
    "promptsDelete",
    deleteGeoPrompt(
      { organizationId: base.organizationId, projectId },
      promptId
    )
  );
  if (!outcome.ok) {
    return geoErrorResponse(c, outcome.failure);
  }

  return c.json({ id: promptId, organization: base.organization }, 200);
});

geoPromptsRoutes.openapi(importPromptsRoute, async (c) => {
  const base = c.get("geo");
  const { projectId } = c.req.valid("param");
  const body = c.req.valid("json");

  let rows: readonly GeoPromptImportRow[] = body.rows ?? [];
  let issues: { line: number; message: string }[] = [];
  if (!body.rows && body.csv) {
    const parsed = parsePromptsCsv(body.csv);
    rows = parsed.rows;
    issues = parsed.issues;
    if (rows.length === 0) {
      return c.json(
        {
          error:
            issues[0]?.message ?? "No importable prompts found in the CSV text",
        },
        400
      );
    }
  }

  // Charged only once the payload is known to contain importable rows, so a
  // caller fixing a malformed CSV does not spend the import budget on 400s.
  const rateLimited = await enforceRatelimit(
    c,
    ratelimit.promptImport,
    "organization"
  );
  if (rateLimited) {
    return rateLimited;
  }

  const outcome = await runGeoEffect(
    "promptsImport",
    importGeoPrompts({ organizationId: base.organizationId, projectId }, rows)
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
      organization: base.organization,
    },
    200
  );
});
