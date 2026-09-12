import "zod/compile";
import { z } from "@hono/zod-openapi";

import { organizationResponseSchema } from "./content";

const scanSchema = z
  .object({
    id: z.string(),
    projectId: z.string(),
    status: z.enum(["running", "completed", "failed"]),
    startedAt: z.string(),
    finishedAt: z.string().nullable(),
    createdAt: z.string(),
  })
  .openapi("GeoScan");

export const listScansQuerySchema = z.object({
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20)
    .openapi({ param: { name: "limit", in: "query" } }),
  page: z.coerce
    .number()
    .int()
    .min(1)
    .default(1)
    .openapi({ param: { name: "page", in: "query" } }),
});

const scanPaginationSchema = z.object({
  limit: z.number().int().min(1),
  currentPage: z.number().int().min(1),
  nextPage: z.number().int().min(1).nullable(),
  previousPage: z.number().int().min(1).nullable(),
  totalPages: z.number().int().min(1),
  totalItems: z.number().int().min(0),
});

export const listScansResponseSchema = z
  .object({
    scans: z.array(scanSchema),
    pagination: scanPaginationSchema,
    organization: organizationResponseSchema,
  })
  .openapi("ListGeoScansResponse");

export const scanResponseSchema = z
  .object({
    scan: scanSchema,
    organization: organizationResponseSchema,
  })
  .openapi("GeoScanResponse");

/**
 * The scan row is created before the workflow is handed off, so the id here is
 * the one `GET /v1/projects/{projectId}/geo/scans/{scanId}` already answers
 * for. The workflow's own run id is deliberately not exposed: it never mapped
 * to a scan a client could read, which made polling a race.
 */
export const createScanResponseSchema = z
  .object({
    scanId: z.string(),
    statusUrl: z.string(),
    organization: organizationResponseSchema,
  })
  .openapi("CreateGeoScanResponse");
