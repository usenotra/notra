import { createRoute } from "@hono/zod-openapi";
import {
  loadGeoSettings,
  upsertGeoSettings,
} from "@notra/geo-core/geo/programs";
import { projectParamsSchema } from "@notra/schemas/api/geo-params";
import {
  patchSettingsRequestSchema,
  settingsResponseSchema,
} from "@notra/schemas/api/geo-settings";

import {
  GEO_COMMON_ERROR_RESPONSES,
  GEO_OPENAPI_TAG,
} from "../constants/geo-openapi";
import { findGeoSelectionError, geoErrorResponse } from "../utils/geo";
import { runGeoEffect } from "../utils/geo-effect";
import { createOpenApiApp } from "../utils/openapi-app";

export const geoSettingsRoutes = createOpenApiApp();

const GEO_TAG = GEO_OPENAPI_TAG;
const commonErrors = GEO_COMMON_ERROR_RESPONSES;

const getSettingsRoute = createRoute({
  method: "get",
  path: "/projects/{projectId}/geo/settings",
  tags: [GEO_TAG],
  operationId: "getGeoSettings",
  summary: "Get a project's GEO settings",
  request: { params: projectParamsSchema },
  responses: {
    200: {
      description: "Settings fetched successfully",
      content: { "application/json": { schema: settingsResponseSchema } },
    },
    ...commonErrors,
  },
});

const patchSettingsRoute = createRoute({
  method: "patch",
  path: "/projects/{projectId}/geo/settings",
  tags: [GEO_TAG],
  operationId: "updateGeoSettings",
  summary: "Replace a project's GEO settings",
  description:
    "Writes the full settings document and re-arms the recurring scan. Engines must be ids from the model catalog this organization can see (the ones `GET /geo/settings` returns) and languages must be supported languages; an unknown value is rejected with a 400 instead of being replaced by a default. Zero data retention is forced off without the ZDR add-on, and engines that are not visible to this caller keep their stored selection. Competitors are managed through the competitors endpoints and are not part of this payload.",
  request: {
    params: projectParamsSchema,
    body: {
      required: true,
      content: { "application/json": { schema: patchSettingsRequestSchema } },
    },
  },
  responses: {
    200: {
      description: "Settings updated successfully",
      content: { "application/json": { schema: settingsResponseSchema } },
    },
    ...commonErrors,
  },
});

geoSettingsRoutes.openapi(getSettingsRoute, async (c) => {
  const base = c.get("geo");
  const { projectId } = c.req.valid("param");
  const outcome = await runGeoEffect(
    "settings",
    loadGeoSettings({ organizationId: base.organizationId, projectId })
  );
  if (!outcome.ok) {
    return geoErrorResponse(c, outcome.failure);
  }

  return c.json(
    {
      configured: outcome.value.configured,
      settings: outcome.value.settings,
      organization: base.organization,
    },
    200
  );
});

geoSettingsRoutes.openapi(patchSettingsRoute, async (c) => {
  const base = c.get("geo");
  const { projectId } = c.req.valid("param");
  const body = c.req.valid("json");
  // The engine catalog is per organization and loaded asynchronously, so this
  // cannot live in the request schema.
  const selectionError = await findGeoSelectionError({
    organizationId: base.organizationId,
    engines: body.engines,
    languages: body.languages,
  });
  if (selectionError) {
    return c.json({ error: selectionError }, 400);
  }

  const outcome = await runGeoEffect(
    "settingsUpsert",
    upsertGeoSettings({
      organizationId: base.organizationId,
      projectId,
      companyName: body.companyName,
      aliases: body.aliases,
      conversionPaths: body.conversionPaths,
      // `upsertGeoSettings` always writes an empty competitor array and then
      // reconciles from `geo_competitors`, so this field is inert. Competitors
      // are owned by the competitors endpoints.
      competitors: [],
      languages: body.languages,
      engines: body.engines,
      enforceZdr: body.enforceZdr,
      nonZdrApprovedEngines: body.nonZdrApprovedEngines,
      pausedAutoPromptIds: body.pausedAutoPromptIds,
      removedAutoPromptIds: body.removedAutoPromptIds,
      enabled: body.enabled,
      scanIntervalHours: body.scanIntervalHours,
    })
  );
  if (!outcome.ok) {
    return geoErrorResponse(c, outcome.failure);
  }

  return c.json(
    {
      configured: outcome.value.configured,
      settings: outcome.value.settings,
      organization: base.organization,
    },
    200
  );
});
