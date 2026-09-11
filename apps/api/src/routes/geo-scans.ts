import { createRoute } from "@hono/zod-openapi";
import { geoScans } from "@notra/db/schema";
import { startGeoScan } from "@notra/geo-core/geo/programs";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import {
  projectParamsSchema,
  scanParamsSchema,
} from "@notra/schemas/api/geo-params";
import {
  createScanResponseSchema,
  listScansQuerySchema,
  listScansResponseSchema,
  scanResponseSchema,
} from "@notra/schemas/api/geo-scans";
import { and, count, desc, eq } from "drizzle-orm";

import { API_TRIGGER_SOURCE } from "../constants/analytics";
import {
  GEO_COMMON_ERROR_RESPONSES,
  GEO_OPENAPI_TAG,
} from "../constants/geo-openapi";
import { trackApiEvent } from "../utils/analytics";
import { geoErrorResponse } from "../utils/geo";
import { runGeoEffect } from "../utils/geo-effect";
import { createOpenApiApp } from "../utils/openapi-app";
import { rateLimitResponse } from "../utils/openapi-responses";
import { enforceRatelimit, RATE_LIMITS, ratelimit } from "../utils/ratelimit";

export const geoScansRoutes = createOpenApiApp();

const GEO_TAG = GEO_OPENAPI_TAG;
const commonErrors = GEO_COMMON_ERROR_RESPONSES;

interface ScanRow {
  id: string;
  projectId: string;
  status: "running" | "completed" | "failed";
  startedAt: Date;
  finishedAt: Date | null;
  createdAt: Date;
}

function serializeScan(row: ScanRow) {
  return {
    id: row.id,
    projectId: row.projectId,
    status: row.status,
    startedAt: row.startedAt.toISOString(),
    finishedAt: row.finishedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

const createScanRoute = createRoute({
  method: "post",
  path: "/projects/{projectId}/geo/scans",
  tags: [GEO_TAG],
  operationId: "createGeoScan",
  summary: "Trigger a GEO scan",
  description:
    "Queues a scan with the Notra dashboard, which owns the model credentials and billing gates. The public API never calls an answer engine itself. The scan record is created before the hand-off, so `scanId` is immediately readable via `GET /v1/projects/{projectId}/geo/scans/{scanId}`. Poll `statusUrl` (also returned as the `Location` header) until `status` leaves `running`. Returns 409 while a scan for this project is still in flight.",
  request: { params: projectParamsSchema },
  responses: {
    202: {
      description: "Scan accepted",
      headers: {
        Location: {
          description: "Relative path of the scan created for this trigger.",
          schema: { type: "string" as const },
        },
      },
      content: { "application/json": { schema: createScanResponseSchema } },
    },
    ...commonErrors,
    429: rateLimitResponse(
      RATE_LIMITS.scanTrigger.requests,
      RATE_LIMITS.scanTrigger.window
    ),
  },
});

const listScansRoute = createRoute({
  method: "get",
  path: "/projects/{projectId}/geo/scans",
  tags: [GEO_TAG],
  operationId: "listGeoScans",
  summary: "List GEO scans",
  request: { params: projectParamsSchema, query: listScansQuerySchema },
  responses: {
    200: {
      description: "Scans fetched successfully",
      content: { "application/json": { schema: listScansResponseSchema } },
    },
    ...commonErrors,
  },
});

const getScanRoute = createRoute({
  method: "get",
  path: "/projects/{projectId}/geo/scans/{scanId}",
  tags: [GEO_TAG],
  operationId: "getGeoScan",
  summary: "Get a single GEO scan",
  request: { params: scanParamsSchema },
  responses: {
    200: {
      description: "Scan fetched successfully",
      content: { "application/json": { schema: scanResponseSchema } },
    },
    ...commonErrors,
  },
});

geoScansRoutes.openapi(createScanRoute, async (c) => {
  const base = c.get("geo");
  const { projectId } = c.req.valid("param");

  // Charged only once the request is known to be well-formed and authorized, so
  // a caller correcting a bad project id does not burn scan slots on 404s. The
  // domain-level failures below (GEO disabled, lost already-running claim) still
  // spend a slot: pre-reading the settings row here would duplicate the atomic
  // claim described in the next comment.
  const rateLimited = await enforceRatelimit(
    c,
    ratelimit.scanTrigger,
    "organization"
  );
  if (rateLimited) {
    return rateLimited;
  }

  // No read-then-check here on purpose: `startGeoScan` takes an atomic claim on
  // the settings row (`claimGeoScanRun`) that every trigger — this route, the
  // dashboard and the cron sweep — shares, and fails with
  // `GeoScanAlreadyRunningError` when it loses. That maps to the 409 below.
  const outcome = await runGeoEffect(
    "startScan",
    startGeoScan({ organizationId: base.organizationId, projectId })
  );
  if (!outcome.ok) {
    return geoErrorResponse(c, outcome.failure);
  }

  // `startGeoScan` inserts the `geo_scans` row before handing the workflow off,
  // so this id is already readable through the GET route below. The workflow's
  // run id stays internal: it identifies a Vercel Workflow run, not a scan, and
  // returning it left clients polling for a row that did not exist yet.
  const { scanId } = outcome.value;
  const statusUrl = `/v1/projects/${projectId}/geo/scans/${scanId}`;
  trackApiEvent(c, {
    event: POSTHOG_EVENTS.GEO_SCAN_STARTED,
    organizationId: base.organizationId,
    projectId,
    properties: { trigger: API_TRIGGER_SOURCE, scan_id: scanId },
  });

  return c.json({ scanId, statusUrl, organization: base.organization }, 202, {
    Location: statusUrl,
  });
});

geoScansRoutes.openapi(listScansRoute, async (c) => {
  const base = c.get("geo");
  const { projectId } = c.req.valid("param");
  const { limit, page } = c.req.valid("query");

  const scope = and(
    eq(geoScans.projectId, projectId),
    eq(geoScans.organizationId, base.organizationId)
  );

  const [totals, rows] = await Promise.all([
    base.db.select({ value: count() }).from(geoScans).where(scope),
    base.db.query.geoScans.findMany({
      where: scope,
      orderBy: [desc(geoScans.startedAt)],
      limit,
      offset: (page - 1) * limit,
    }),
  ]);

  const totalItems = totals.at(0)?.value ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));

  return c.json(
    {
      scans: rows.map(serializeScan),
      pagination: {
        limit,
        currentPage: page,
        nextPage: page < totalPages ? page + 1 : null,
        previousPage: page > 1 ? page - 1 : null,
        totalPages,
        totalItems,
      },
      organization: base.organization,
    },
    200
  );
});

geoScansRoutes.openapi(getScanRoute, async (c) => {
  const base = c.get("geo");
  const { projectId, scanId } = c.req.valid("param");
  const row = await base.db.query.geoScans.findFirst({
    where: and(
      eq(geoScans.id, scanId),
      eq(geoScans.projectId, projectId),
      eq(geoScans.organizationId, base.organizationId)
    ),
  });

  if (!row) {
    return c.json({ error: "Scan not found" }, 404);
  }

  return c.json(
    { scan: serializeScan(row), organization: base.organization },
    200
  );
});
