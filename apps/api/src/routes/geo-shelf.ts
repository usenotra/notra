import { createRoute } from "@hono/zod-openapi";
import { loadGeoShelfSources } from "@notra/geo-core/geo/shelf";
import { projectParamsSchema } from "@notra/schemas/api/geo-params";
import {
  geoShelfListQuerySchema,
  geoShelfListResponseSchema,
} from "@notra/schemas/api/geo-shelf";
import { geoShelfSourceSchema } from "@notra/schemas/dashboard/geo-shelf";

import {
  GEO_COMMON_ERROR_RESPONSES,
  GEO_OPENAPI_TAG,
} from "../constants/geo-openapi";
import { runGeoEffect } from "../runtime/geo";
import { attachGeoOrganization, geoErrorResponse } from "../utils/geo";
import { createOpenApiApp } from "../utils/openapi-app";

export const geoShelfRoutes = createOpenApiApp();

const listShelfSourcesRoute = createRoute({
  method: "get",
  path: "/projects/{projectId}/geo/shelf-sources",
  tags: [GEO_OPENAPI_TAG],
  operationId: "listGeoShelfSources",
  summary: "List stored GEO shelf sources",
  description:
    "Returns a bounded page of cited and manually tracked sources, newest updates first.",
  request: { params: projectParamsSchema, query: geoShelfListQuerySchema },
  responses: {
    200: {
      description: "Shelf sources fetched successfully",
      content: { "application/json": { schema: geoShelfListResponseSchema } },
    },
    ...GEO_COMMON_ERROR_RESPONSES,
  },
});

geoShelfRoutes.openapi(listShelfSourcesRoute, async (c) => {
  const base = c.get("geo");
  const { projectId } = c.req.valid("param");
  const { offset, limit } = c.req.valid("query");
  const outcome = await runGeoEffect(
    "shelfSources",
    loadGeoShelfSources({
      organizationId: base.organizationId,
      projectId,
      offset,
      limit,
    })
  );
  if (!outcome.ok) {
    return geoErrorResponse(c, outcome.failure);
  }
  return c.json(
    attachGeoOrganization(base.organization, {
      ...outcome.value,
      sources: outcome.value.sources.map((source) =>
        geoShelfSourceSchema.parse(source)
      ),
    }),
    200
  );
});
