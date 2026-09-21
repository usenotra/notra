import { geoLog, useLogger } from "@notra/ai/evlog";
import { isAiGatewayConfigured } from "@notra/ai/gateway";
import { db } from "@notra/db/drizzle";
import {
  createGeoAdhocScan,
  discardQueuedGeoAdhocScan,
  getGeoAdhocScan,
  listGeoAdhocScanModels,
  requireQueuedGeoAdhocScan,
} from "@notra/geo-core/geo/adhoc-scan";
import { describeGeoError } from "@notra/geo-core/utils/geo-log";
import { sql } from "drizzle-orm";
import { Effect, Schema } from "effect";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { HTTPException } from "hono/http-exception";

import { RUNNER_MAX_REQUEST_BODY_BYTES } from "../constants/runner";
import { geoRunnerLayer } from "../layers/geo";
import { RunQueue } from "../services/run-queue";
import { isAuthorized, isRunnerSecretConfigured } from "./auth";

const CreateScanBody = Schema.Struct({
  organizationId: Schema.String,
  projectId: Schema.String,
  prompt: Schema.String,
  engines: Schema.Array(Schema.String),
  webSearch: Schema.optionalKey(Schema.Boolean),
  language: Schema.optionalKey(Schema.String),
});

const ScanScope = Schema.Struct({
  organizationId: Schema.String,
  projectId: Schema.String,
});

const decodeCreateScan = Schema.decodeUnknownPromise(CreateScanBody);
const decodeScanScope = Schema.decodeUnknownPromise(ScanScope);

const failure = (status: number, code: string, message: string) =>
  Response.json({ error: { code, message } }, { status });

const unauthorized = () =>
  failure(401, "unauthorized", "Invalid runner credentials");
const notReady = () => failure(503, "not_ready", "Runner is not ready");

export function createApp(
  queue: RunQueue["Service"],
  runnerSecret: string | undefined,
  layer: typeof geoRunnerLayer = geoRunnerLayer
) {
  const app = new Hono();

  app.onError((error, c) => {
    if (error instanceof HTTPException) {
      return error.getResponse();
    }
    geoLog.error({
      event: "geo.runner.request_failed",
      method: c.req.method,
      path: c.req.path,
      ...describeGeoError(error),
    });
    return failure(500, "internal_error", "Internal server error");
  });

  app.use("*", async (c, next) => {
    const startedAt = performance.now();
    const requestId = c.req.header("x-request-id") ?? crypto.randomUUID();
    useLogger().set({
      feature: "geo_runner",
      requestId,
      method: c.req.method,
      path: c.req.path,
    });
    c.header("x-request-id", requestId);

    try {
      await next();
    } finally {
      const event = {
        event: "geo.runner.request" as const,
        method: c.req.method,
        path: c.req.path,
        status: c.res.status,
        durationMs: Math.round(performance.now() - startedAt),
      };
      if (c.res.status >= 500) {
        geoLog.error(event);
      } else if (c.res.status >= 400) {
        geoLog.warn(event);
      } else {
        geoLog.info(event);
      }
    }
  });

  app.use("*", async (c, next) => {
    if (c.req.path === "/health" || c.req.path === "/ready") {
      await next();
      return;
    }
    if (!isAuthorized(c.req.header("authorization"), runnerSecret)) {
      return unauthorized();
    }
    await next();
  });

  app.get("/health", (c) => c.json({ ok: true }));

  app.get("/ready", async (c) => {
    if (!isRunnerSecretConfigured(runnerSecret)) {
      return notReady();
    }
    if (!isAiGatewayConfigured()) {
      return notReady();
    }
    try {
      await db.execute(sql`select 1`);
      return c.json({ ok: true });
    } catch (error) {
      geoLog.error({
        event: "geo.runner.readiness_failed",
        ...describeGeoError(error),
      });
      return notReady();
    }
  });

  app.use(
    "/scans",
    bodyLimit({
      maxSize: RUNNER_MAX_REQUEST_BODY_BYTES,
      onError: () =>
        failure(413, "request_too_large", "Request body is too large"),
    })
  );

  app.get("/models", async (c) => {
    let scope: Schema.Schema.Type<typeof ScanScope>;
    try {
      scope = await decodeScanScope(c.req.query());
    } catch (error) {
      return failure(400, "invalid_request", String(error));
    }

    return Effect.runPromise(
      listGeoAdhocScanModels(scope).pipe(
        Effect.provide(layer),
        Effect.map((models) =>
          Response.json(
            { models },
            { headers: { "cache-control": "private, max-age=60" } }
          )
        ),
        Effect.catchTags({
          GeoProjectNotFoundError: () =>
            Effect.succeed(
              failure(404, "project_not_found", "Project not found")
            ),
          GeoSettingsMissingError: () =>
            Effect.succeed(
              failure(
                404,
                "project_not_found",
                "GEO is not set up for this project"
              )
            ),
        })
      )
    );
  });

  app.post("/scans", async (c) => {
    let body: Schema.Schema.Type<typeof CreateScanBody>;
    try {
      body = await decodeCreateScan(await c.req.json());
    } catch (error) {
      return failure(400, "invalid_request", String(error));
    }

    return Effect.runPromise(
      Effect.gen(function* () {
        const scan = yield* createGeoAdhocScan({
          ...body,
          idempotencyKey: c.req.header("idempotency-key") ?? "",
        }).pipe(Effect.provide(layer));
        if (!scan.created && scan.status !== "queued") {
          return Response.json(
            { id: scan.id, status: scan.status },
            { headers: { "cache-control": "no-store" } }
          );
        }
        const accepted = yield* queue.offer(scan.id);
        if (!accepted) {
          if (scan.created) {
            yield* discardQueuedGeoAdhocScan(scan.id);
          }
          return failure(
            503,
            "runner_busy",
            "The runner backlog is full. Retry shortly."
          );
        }
        return Response.json(
          { id: scan.id, status: "queued" },
          { status: 202, headers: { "cache-control": "no-store" } }
        );
      }).pipe(
        Effect.catchTags({
          GeoAdhocScanInvalidError: (error) =>
            Effect.succeed(failure(422, "invalid_scan", error.message)),
          GeoAdhocScanConflictError: (error) =>
            Effect.succeed(failure(409, "idempotency_conflict", error.message)),
          GeoProjectNotFoundError: () =>
            Effect.succeed(
              failure(404, "project_not_found", "Project not found")
            ),
          GeoSettingsMissingError: () =>
            Effect.succeed(
              failure(
                404,
                "project_not_found",
                "GEO is not set up for this project"
              )
            ),
        })
      )
    );
  });

  app.post("/scans/:scanId/run", (c) => {
    const scanId = c.req.param("scanId");
    return Effect.runPromise(
      Effect.gen(function* () {
        yield* requireQueuedGeoAdhocScan(scanId);
        const accepted = yield* queue.offer(scanId);
        return accepted
          ? Response.json({ id: scanId, status: "queued" }, { status: 202 })
          : failure(
              503,
              "runner_busy",
              "The runner backlog is full. Retry shortly."
            );
      }).pipe(
        Effect.catchTags({
          GeoAdhocScanNotFoundError: () =>
            Effect.succeed(failure(404, "scan_not_found", "Scan not found")),
          GeoAdhocScanConflictError: (error) =>
            Effect.succeed(failure(409, "scan_not_queued", error.message)),
        })
      )
    );
  });

  app.get("/scans/:scanId", async (c) => {
    let scope: Schema.Schema.Type<typeof ScanScope>;
    try {
      scope = await decodeScanScope(c.req.query());
    } catch (error) {
      return failure(400, "invalid_request", String(error));
    }

    return Effect.runPromise(
      getGeoAdhocScan(scope, c.req.param("scanId")).pipe(
        Effect.map((scan) =>
          Response.json(scan, { headers: { "cache-control": "no-store" } })
        ),
        Effect.catchTags({
          GeoAdhocScanNotFoundError: () =>
            Effect.succeed(failure(404, "scan_not_found", "Scan not found")),
          GeoProjectNotFoundError: () =>
            Effect.succeed(
              failure(404, "project_not_found", "Project not found")
            ),
          GeoSettingsMissingError: () =>
            Effect.succeed(
              failure(
                404,
                "project_not_found",
                "GEO is not set up for this project"
              )
            ),
        })
      )
    );
  });

  return app;
}
