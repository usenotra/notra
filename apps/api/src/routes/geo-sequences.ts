import { createRoute } from "@hono/zod-openapi";
import {
  createGeoSequence,
  deleteGeoSequence,
  listGeoSequences,
  updateGeoSequence,
} from "@notra/geo-core/geo/sequences";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import {
  projectParamsSchema,
  sequenceParamsSchema,
} from "@notra/schemas/api/geo-params";
import {
  createSequenceRequestSchema,
  deleteSequenceResponseSchema,
  listSequencesResponseSchema,
  patchSequenceRequestSchema,
  runSequenceResponseSchema,
  sequenceResponseSchema,
} from "@notra/schemas/api/geo-sequences";
import { internalGeoSequenceRunResponseSchema } from "@notra/schemas/api/internal-geo";

import { API_TRIGGER_SOURCE } from "../constants/analytics";
import { GEO_SEQUENCE_RUN_INTERNAL_PATH } from "../constants/geo";
import {
  GEO_COMMON_ERROR_RESPONSES,
  GEO_OPENAPI_TAG,
} from "../constants/geo-openapi";
import { trackApiEvent } from "../utils/analytics";
import { geoErrorResponse } from "../utils/geo";
import { runGeoEffect, runRemoteGeoEffect } from "../utils/geo-effect";
import {
  getInternalWorkflowUrl,
  SYNCHRONOUS_INTERNAL_CALL_TIMEOUT_MS,
} from "../utils/internal-workflow";
import { createOpenApiApp } from "../utils/openapi-app";
import { errorResponse, rateLimitResponse } from "../utils/openapi-responses";
import { enforceRatelimit, RATE_LIMITS, ratelimit } from "../utils/ratelimit";

export const geoSequencesRoutes = createOpenApiApp();

const GEO_TAG = GEO_OPENAPI_TAG;
const commonErrors = GEO_COMMON_ERROR_RESPONSES;

const listSequencesRoute = createRoute({
  method: "get",
  path: "/projects/{projectId}/geo/sequences",
  tags: [GEO_TAG],
  operationId: "listGeoSequences",
  summary: "List GEO prompt sequences",
  request: { params: projectParamsSchema },
  responses: {
    200: {
      description: "Sequences fetched successfully",
      content: { "application/json": { schema: listSequencesResponseSchema } },
    },
    ...commonErrors,
  },
});

const createSequenceRoute = createRoute({
  method: "post",
  path: "/projects/{projectId}/geo/sequences",
  tags: [GEO_TAG],
  operationId: "createGeoSequence",
  summary: "Create a GEO prompt sequence",
  request: {
    params: projectParamsSchema,
    body: {
      required: true,
      content: { "application/json": { schema: createSequenceRequestSchema } },
    },
  },
  responses: {
    201: {
      description: "Sequence created successfully",
      content: { "application/json": { schema: sequenceResponseSchema } },
    },
    ...commonErrors,
  },
});

const patchSequenceRoute = createRoute({
  method: "patch",
  path: "/projects/{projectId}/geo/sequences/{sequenceId}",
  tags: [GEO_TAG],
  operationId: "updateGeoSequence",
  summary: "Update a GEO prompt sequence",
  request: {
    params: sequenceParamsSchema,
    body: {
      required: true,
      content: { "application/json": { schema: patchSequenceRequestSchema } },
    },
  },
  responses: {
    200: {
      description: "Sequence updated successfully",
      content: { "application/json": { schema: sequenceResponseSchema } },
    },
    ...commonErrors,
  },
});

const deleteSequenceRoute = createRoute({
  method: "delete",
  path: "/projects/{projectId}/geo/sequences/{sequenceId}",
  tags: [GEO_TAG],
  operationId: "deleteGeoSequence",
  summary: "Delete a GEO prompt sequence",
  request: { params: sequenceParamsSchema },
  responses: {
    200: {
      description: "Sequence deleted successfully",
      content: { "application/json": { schema: deleteSequenceResponseSchema } },
    },
    ...commonErrors,
  },
});

const runSequenceRoute = createRoute({
  method: "post",
  path: "/projects/{projectId}/geo/sequences/{sequenceId}/run",
  tags: [GEO_TAG],
  operationId: "runGeoSequence",
  summary: "Run a GEO prompt sequence now",
  description:
    "Runs the sequence synchronously and answers with its result. The call is not queued: the request stays open for the whole run, which plays every turn against every available answer engine and can take several minutes. Use a client timeout of at least five minutes; after four minutes the API stops waiting and answers 409 while the run finishes on its own. Do not retry; read the result from the project's GEO checks. The work happens inside the Notra dashboard, which owns the model credentials and billing gates; the public API never calls an answer engine itself. Results also land in the project's GEO checks.",
  request: { params: sequenceParamsSchema },
  responses: {
    200: {
      description: "Sequence run completed",
      content: { "application/json": { schema: runSequenceResponseSchema } },
    },
    ...commonErrors,
    409: errorResponse(
      "Sequence execution is still running after the internal timeout; do not retry the run"
    ),
    429: rateLimitResponse(
      RATE_LIMITS.sequenceRun.requests,
      RATE_LIMITS.sequenceRun.window
    ),
  },
});

geoSequencesRoutes.openapi(listSequencesRoute, async (c) => {
  const base = c.get("geo");
  const { projectId } = c.req.valid("param");
  const outcome = await runGeoEffect(
    "sequencesList",
    listGeoSequences({ organizationId: base.organizationId, projectId })
  );
  if (!outcome.ok) {
    return geoErrorResponse(c, outcome.failure);
  }

  return c.json(
    { sequences: outcome.value.sequences, organization: base.organization },
    200
  );
});

geoSequencesRoutes.openapi(createSequenceRoute, async (c) => {
  const base = c.get("geo");
  const { projectId } = c.req.valid("param");
  const { name, steps } = c.req.valid("json");
  const outcome = await runGeoEffect(
    "sequenceCreate",
    createGeoSequence(
      { organizationId: base.organizationId, projectId },
      { name, steps }
    )
  );
  if (!outcome.ok) {
    return geoErrorResponse(c, outcome.failure);
  }

  return c.json(
    { sequence: outcome.value, organization: base.organization },
    201
  );
});

geoSequencesRoutes.openapi(patchSequenceRoute, async (c) => {
  const base = c.get("geo");
  const { projectId, sequenceId } = c.req.valid("param");
  const update = c.req.valid("json");

  const outcome = await runGeoEffect(
    "sequenceUpdate",
    updateGeoSequence(
      { organizationId: base.organizationId, projectId },
      { sequenceId, ...update }
    )
  );
  if (!outcome.ok) {
    return geoErrorResponse(c, outcome.failure);
  }

  return c.json(
    { sequence: outcome.value, organization: base.organization },
    200
  );
});

geoSequencesRoutes.openapi(deleteSequenceRoute, async (c) => {
  const base = c.get("geo");
  const { projectId, sequenceId } = c.req.valid("param");

  const outcome = await runGeoEffect(
    "sequenceDelete",
    deleteGeoSequence(
      { organizationId: base.organizationId, projectId },
      sequenceId
    )
  );
  if (!outcome.ok) {
    return geoErrorResponse(c, outcome.failure);
  }

  return c.json({ id: sequenceId, organization: base.organization }, 200);
});

geoSequencesRoutes.openapi(runSequenceRoute, async (c) => {
  const base = c.get("geo");
  const { projectId, sequenceId } = c.req.valid("param");

  const url = getInternalWorkflowUrl(c.env, GEO_SEQUENCE_RUN_INTERNAL_PATH);
  if (!url) {
    return c.json({ error: "Sequence runs are unavailable" }, 503);
  }

  // Charged immediately before the remote run. Project ownership and service
  // availability have already been established; the canonical sequence lookup
  // happens in `runGeoSequenceNow` inside the internal endpoint.
  const rateLimited = await enforceRatelimit(
    c,
    ratelimit.sequenceRun,
    "organization"
  );
  if (rateLimited) {
    return rateLimited;
  }

  // Synchronous by necessity: there is no GEO sequence workflow to hand off
  // to, so the dashboard runs the sequence to completion and we relay its real
  // result. Returning 202 with a made-up run id — as this route used to — named
  // nothing a client could poll.
  //
  // TODO(Phase 6 — durable workflow): once the sequence run is a durable
  // workflow, hand off and return a real run id plus a status endpoint.
  const outcome = await runRemoteGeoEffect(
    "sequenceRun",
    url,
    { organizationId: base.organizationId, projectId, sequenceId },
    {
      responseSchema: internalGeoSequenceRunResponseSchema,
      timeoutMs: SYNCHRONOUS_INTERNAL_CALL_TIMEOUT_MS,
      timeoutMessage:
        "The sequence run is taking longer than expected and is still in progress. Do not retry. Check the project's GEO checks for the result.",
    }
  );
  if (!outcome.ok) {
    return geoErrorResponse(c, outcome.failure);
  }

  trackApiEvent(c, {
    event: POSTHOG_EVENTS.GEO_SEQUENCE_RUN,
    organizationId: base.organizationId,
    projectId,
    properties: {
      trigger: API_TRIGGER_SOURCE,
      sequence_id: sequenceId,
      check_count: outcome.value.checks,
    },
  });

  return c.json(
    {
      checks: outcome.value.checks,
      mentions: outcome.value.mentions,
      engines: outcome.value.engines,
      organization: base.organization,
    },
    200
  );
});
