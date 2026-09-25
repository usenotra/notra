import { flushGeoLog, geoLog } from "@notra/ai/evlog";
import type { GeoLogEvent } from "@notra/ai/types/evlog";
import { ingestGeoTrafficEvents } from "@notra/analytics/tinybird/client";
import type { GeoTrafficEventRow } from "@notra/analytics/tinybird/datasources";
import { GEO_INGEST_BEARER_PREFIX } from "@notra/geo-core/constants/geo";
import { verifyGeoIngestToken } from "@notra/geo-core/geo/ingest";
import { geoRequestPayloadSchema } from "@notra/geo-core/schemas/geo";
import type { GeoIngestIdentity } from "@notra/geo-core/types/geo";
import { isTrackedGeoVisitorType } from "@notra/geo-core/utils/ai-traffic";
import { acceptsIngestHost } from "@notra/geo-core/utils/geo-project-domains";
import { Effect } from "effect";
import { after, type NextRequest } from "next/server";

import { trackGeoIngestAnalytics } from "@/lib/geo-ingest/analytics";
import { classifyVisitor } from "@/lib/geo-ingest/classify-visitor";
import {
  GeoIngestFailedError,
  GeoIngestInvalidPayloadError,
  GeoIngestInvalidTokenError,
  GeoIngestMissingTokenError,
  GeoIngestRateLimitedError,
  GeoIngestUnparseableUrlError,
} from "@/lib/geo-ingest/errors";
import { buildGeoTrafficEvent, toCapturedDate } from "@/lib/geo-ingest/event";
import { loadIngestAllowedHosts } from "@/lib/geo-ingest/hosts";
import { isGeoIngestIdentityActive } from "@/lib/geo-ingest/identity";
import { resolveJourneyId } from "@/lib/geo-ingest/journey";
import { ratelimit } from "@/utils/ratelimit";

// Dropped (human/unknown) traffic outnumbers stored events by an order of
// magnitude; log a sample so drop reasons stay visible without paying for a
// log line per page view.
const DROPPED_LOG_SAMPLE_RATE = 0.05;

function emitIngestLog(fields: Omit<GeoLogEvent, "event">) {
  geoLog.info({ event: "geo.ingest", ...fields });
}

const readBearerIdentity = Effect.fn("geoIngest.readBearerIdentity")(function* (
  request: NextRequest
) {
  const header = request.headers.get("authorization");
  const token = header?.startsWith(GEO_INGEST_BEARER_PREFIX)
    ? header.slice(GEO_INGEST_BEARER_PREFIX.length).trim()
    : "";

  if (token.length === 0) {
    return yield* Effect.fail(new GeoIngestMissingTokenError({}));
  }

  const identity = verifyGeoIngestToken(token);
  if (!identity) {
    return yield* Effect.fail(new GeoIngestInvalidTokenError({}));
  }

  return identity;
});

const enforceRateLimit = Effect.fn("geoIngest.rateLimit")(function* (
  organizationId: string
) {
  const { success } = yield* Effect.tryPromise({
    try: () => ratelimit.geoIngest.limit(organizationId),
    catch: (cause) => new GeoIngestFailedError({ cause }),
  });
  if (!success) {
    return yield* Effect.fail(
      new GeoIngestRateLimitedError({ organizationId })
    );
  }
});

const readPayload = Effect.fn("geoIngest.readPayload")(function* (
  request: NextRequest
) {
  const body = yield* Effect.promise(() => request.json().catch(() => null));
  const parsed = geoRequestPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return yield* Effect.fail(
      new GeoIngestInvalidPayloadError({ issues: parsed.error.issues })
    );
  }
  return parsed.data;
});

const parseUrl = Effect.fn("geoIngest.parseUrl")(function* (value: string) {
  return yield* Effect.try({
    try: () => new URL(value),
    catch: () => new GeoIngestUnparseableUrlError({ url: value }),
  });
});

const ingestEvent = Effect.fn("geoIngest.ingest")(function* (
  event: GeoTrafficEventRow
) {
  yield* Effect.tryPromise({
    try: () => ingestGeoTrafficEvents([event]),
    catch: (cause) => new GeoIngestFailedError({ cause }),
  });
});

// Auth errors stay authoritative over payload errors: before classification
// moved ahead of the identity lookup, a revoked token failed as 401 no
// matter how broken the payload was. The re-check only runs on the (rare)
// validation-error path, so well-formed traffic keeps the zero-I/O fast
// path.
const failWithAuthPrecedence = Effect.fn("geoIngest.failWithAuthPrecedence")(
  function* (
    identity: GeoIngestIdentity,
    error: GeoIngestInvalidPayloadError | GeoIngestUnparseableUrlError
  ) {
    const active = yield* Effect.promise(() =>
      isGeoIngestIdentityActive(identity)
    );
    if (!active) {
      return yield* Effect.fail(new GeoIngestInvalidTokenError({}));
    }
    return yield* Effect.fail(error);
  }
);

export const runGeoIngest = Effect.fn("geoIngest.run")(function* (
  request: NextRequest
) {
  const identity = yield* readBearerIdentity(request);

  const payloadResult = yield* Effect.result(readPayload(request));
  if (payloadResult._tag === "Failure") {
    return yield* failWithAuthPrecedence(identity, payloadResult.failure);
  }
  const payload = payloadResult.success;

  const urlResult = yield* Effect.result(parseUrl(payload.url));
  if (urlResult._tag === "Failure") {
    return yield* failWithAuthPrecedence(identity, urlResult.failure);
  }
  const url = urlResult.success;
  // Classification is pure CPU on the payload. Run it before any Redis/DB
  // round trip so the ~95% of requests that are not AI traffic cost nothing.
  const classification = classifyVisitor({
    userAgent: payload.userAgent,
    referer: payload.referer,
    accept: payload.accept,
    signals: payload.signals,
  });
  if (!isTrackedGeoVisitorType(classification.visitorType)) {
    yield* Effect.sync(() => {
      if (Math.random() < DROPPED_LOG_SAMPLE_RATE) {
        emitIngestLog({
          outcome: "dropped",
          reason: "visitor_type",
          visitorType: classification.visitorType,
          organizationId: identity.organizationId,
          projectId: identity.projectId ?? "",
        });
      }
    });
    return;
  }

  const [active, allowedHosts] = yield* Effect.all(
    [
      Effect.promise(() => isGeoIngestIdentityActive(identity)),
      Effect.promise(() => loadIngestAllowedHosts(identity)),
    ],
    { concurrency: "unbounded" }
  );
  if (!active) {
    return yield* Effect.fail(new GeoIngestInvalidTokenError({}));
  }
  // A legacy token has no project in its signature. On a host-lookup outage,
  // failing open could accept a sibling project's traffic as unassigned.
  if (!identity.projectId && allowedHosts === null) {
    return yield* Effect.fail(
      new GeoIngestFailedError({
        cause: new Error("Traffic host lookup failed"),
      })
    );
  }
  if (!acceptsIngestHost(url.hostname, allowedHosts)) {
    yield* Effect.sync(() =>
      emitIngestLog({
        outcome: "dropped",
        reason: "host",
        host: url.hostname,
        organizationId: identity.organizationId,
        projectId: identity.projectId ?? "",
      })
    );
    return;
  }

  const capturedAt = toCapturedDate(payload.timestamp);
  const journey = resolveJourneyId({
    url,
    source: classification.source,
    ip: payload.ip,
    capturedAt,
    visitorType: classification.visitorType,
    category: classification.category,
  });
  const event = buildGeoTrafficEvent({
    organizationId: identity.organizationId,
    projectId: identity.projectId,
    payload,
    url,
    capturedAt,
    classification,
    journey,
  });

  yield* enforceRateLimit(identity.organizationId);
  const ingestStartedAt = Date.now();
  yield* ingestEvent(event);
  const ingestMs = Date.now() - ingestStartedAt;
  yield* Effect.sync(() =>
    emitIngestLog({
      outcome: "ingested",
      visitorType: classification.visitorType,
      source: classification.source,
      ingestMs,
      organizationId: identity.organizationId,
      projectId: identity.projectId ?? "",
    })
  );
  // Analytics must not hold the 202 open for the site that sent the event.
  yield* Effect.sync(() =>
    after(async () => {
      try {
        await Effect.runPromise(trackGeoIngestAnalytics({ identity, event }));
      } catch (error) {
        console.error("[geo-ingest] Deferred analytics failed", {
          error,
          organizationId: identity.organizationId,
          projectId: identity.projectId,
        });
      }
      await flushGeoLog().catch(() => null);
    })
  );
});
