import "zod/compile";
import { z } from "@hono/zod-openapi";

import { geoShelfSourceSchema } from "../dashboard/geo-shelf";
import { organizationResponseSchema } from "./content";

export const geoShelfListQuerySchema = z.object({
  offset: z.coerce.number().int().min(0).max(100_000).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const geoShelfListResponseSchema = z
  .object({
    sources: z.array(geoShelfSourceSchema),
    nextOffset: z.number().int().nonnegative().nullable(),
    organization: organizationResponseSchema,
  })
  .openapi("GeoShelfListResponse");
