import {
  ingestGeoTrafficEvents,
  ingestWebPageViews,
} from "@notra/analytics/tinybird/client";
import type {
  GeoTrafficEventRow,
  WebPageViewRow,
} from "@notra/analytics/tinybird/datasources";
import { GEO_INGEST_BEARER_PREFIX } from "@notra/geo-core/constants/geo";
import {
  isGeoIngestSiteToken,
  verifyGeoIngestSiteToken,
  verifyGeoIngestToken,
} from "@notra/geo-core/geo/ingest";
import { geoRequestPayloadSchema } from "@notra/geo-core/schemas/geo";
import type {
  GeoIngestIdentity,
  GeoVisitorType,
} from "@notra/geo-core/types/geo";
import { isTrackedGeoVisitorType } from "@notra/geo-core/utils/ai-traffic";
import { acceptsIngestHost } from "@notra/geo-core/utils/geo-project-domains";
import { isServedBySite } from "@notra/geo-core/utils/ingest-sites";
import { Effect } from "effect";

import { GEO_INGEST_TINYBIRD_TIMEOUT_MS } from "../constants/ingest";
import type {
  GeoIngestBuffer,
  GeoIngestDefer,
  GeoIngestDropReason,
  GeoIngestResult,
} from "../types/ingest";
import { geoIngestAdmissionKey } from "../utils/geo-ingest-admission-key";
import { logGeoFailure } from "../utils/geo-log";
import { trackGeoIngestAnalytics } from "./analytics";
import { classifyVisitor } from "./classify-visitor";
import {
  GeoIngestFailedError,
  GeoIngestInvalidPayloadError,
  GeoIngestInvalidTokenError,
  GeoIngestMissingTokenError,
  GeoIngestRateLimitedError,
  GeoIngestUnparseableUrlError,
} from "./errors";
import { buildGeoTrafficEvent, toCapturedDate } from "./event";
import { loadIngestAllowedHosts } from "./hosts";
import { isGeoIngestIdentityActive } from "./identity";
import { resolveJourneyId } from "./journey";
import { announceGeoTrafficEvent, expediteForLiveViewers } from "./live";
import {
  geoIngestAdmissionRatelimit,
  geoIngestRatelimit,
  webIngestRatelimit,
} from "./ratelimit";
import { loadIngestSite, loadOrganizationSitePrefixes } from "./sites";
import { buildWebPageView, isHumanPageView } from "./web";

const readSiteIdentity = Effect.fn("geoIngest.readSiteIdentity")(function* (
  token: string
) {
  const siteId = verifyGeoIngestSiteToken(token);
  if (!siteId) {
    return yield* Effect.fail(new GeoIngestInvalidTokenError({}));
  }
  const site = yield* Effect.tryPromise({
    try: () => loadIngestSite(siteId),
    catch: (cause) => new GeoIngestFailedError({ cause }),
  });
  if (!site) {
    return yield* Effect.fail(new GeoIngestInvalidTokenError({}));
  }
  return {
    organizationId: site.organizationId,
    projectId: site.projectId,
    generation: 0,
    site: { id: site.id, hosts: site.hosts },
  } satisfies GeoIngestIdentity;
});

const readBearerIdentity = Effect.fn("geoIngest.readBearerIdentity")(function* (
  request: Request
) {
  const header = request.headers.get("authorization");
  const token = header?.startsWith(GEO_INGEST_BEARER_PREFIX)
    ? header.slice(GEO_INGEST_BEARER_PREFIX.length).trim()
    : "";

  if (token.length === 0) {
    return yield* Effect.fail(new GeoIngestMissingTokenError({}));
  }

  if (isGeoIngestSiteToken(token)) {
    return yield* readSiteIdentity(token);
  }

  const identity = verifyGeoIngestToken(token);
  if (!identity) {
    return yield* Effect.fail(new GeoIngestInvalidTokenError({}));
  }

  return identity;
});

const enforceRateLimit = Effect.fn("geoIngest.rateLimit")(function* (
  organizationId: string,
  admissionKey?: string
) {
  const limiter = admissionKey
    ? geoIngestAdmissionRatelimit
    : geoIngestRatelimit;
  const { success, reason } = yield* Effect.tryPromise({
    try: () => limiter.limit(admissionKey ?? organizationId),
    catch: (cause) => new GeoIngestFailedError({ cause }),
  });
  // Upstash reports timeouts as success; an unavailable limiter is not approval.
  if (reason === "timeout") {
    return yield* Effect.fail(
      new GeoIngestFailedError({
        cause: new Error("Rate limit check timed out"),
      })
    );
  }
  if (!success) {
    return yield* Effect.fail(
      new GeoIngestRateLimitedError({ organizationId })
    );
  }
});

const readPayload = Effect.fn("geoIngest.readPayload")(function* (
  request: Request
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

const admitWebPageView = Effect.fn("geoIngest.admitWebPageView")(function* (
  admissionKey: string
) {
  return yield* Effect.promise(() =>
    webIngestRatelimit
      .limit(admissionKey)
      .then((result) => result.success)
      .catch(() => true)
  );
});

const storeWebPageView = Effect.fn("geoIngest.storeWebPageView")(function* (
  row: WebPageViewRow,
  buffer: GeoIngestBuffer | undefined
) {
  if (buffer?.enqueueWeb?.(row)) {
    return;
  }
  yield* Effect.promise(() =>
    ingestWebPageViews([row]).catch((error: unknown) => {
      logGeoFailure(
        "geo.ingest.web_write_failed",
        "Web page view write failed",
        error,
        { organizationId: row.organization_id }
      );
      return null;
    })
  );
});

const ingestEvent = Effect.fn("geoIngest.ingest")(function* (
  event: GeoTrafficEventRow
) {
  const result = yield* Effect.tryPromise({
    try: () => ingestGeoTrafficEvents([event]),
    catch: (cause) => new GeoIngestFailedError({ cause }),
  }).pipe(
    Effect.timeoutOrElse({
      duration: GEO_INGEST_TINYBIRD_TIMEOUT_MS,
      orElse: () =>
        Effect.fail(
          new GeoIngestFailedError({
            cause: new Error(
              `Tinybird write timed out after ${GEO_INGEST_TINYBIRD_TIMEOUT_MS}ms`
            ),
          })
        ),
    })
  );
  // A 202 promises the event was stored: a missing client or a quarantined
  // row would otherwise be acknowledged and silently lost.
  if (!result) {
    return yield* Effect.fail(
      new GeoIngestFailedError({
        cause: new Error("Tinybird is not configured"),
      })
    );
  }
  if (result.quarantined_rows > 0) {
    return yield* Effect.fail(
      new GeoIngestFailedError({
        cause: new Error("Tinybird quarantined the event"),
      })
    );
  }
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
    yield* enforceRateLimit(
      identity.organizationId,
      geoIngestAdmissionKey(identity)
    );
    const active = yield* Effect.promise(() =>
      isGeoIngestIdentityActive(identity)
    );
    if (!active) {
      return yield* Effect.fail(new GeoIngestInvalidTokenError({}));
    }
    return yield* Effect.fail(error);
  }
);

function droppedResult(
  identity: GeoIngestIdentity,
  visitorType: GeoVisitorType,
  reason: GeoIngestDropReason,
  host?: string
): GeoIngestResult {
  return {
    outcome: "dropped",
    reason,
    organizationId: identity.organizationId,
    projectId: identity.projectId,
    visitorType,
    ...(host === undefined ? {} : { host }),
  };
}

export const runGeoIngest = Effect.fn("geoIngest.run")(function* (
  request: Request,
  defer: GeoIngestDefer,
  buffer?: GeoIngestBuffer
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
  const isAi = isTrackedGeoVisitorType(classification.visitorType);
  const countsVisitors = isHumanPageView({ classification, payload, url });
  if (!(isAi || countsVisitors)) {
    return droppedResult(identity, classification.visitorType, "visitor_type");
  }

  if (isAi) {
    yield* enforceRateLimit(
      identity.organizationId,
      geoIngestAdmissionKey(identity)
    );
  } else if (!(yield* admitWebPageView(geoIngestAdmissionKey(identity)))) {
    return droppedResult(
      identity,
      classification.visitorType,
      "web_rate_limited"
    );
  }
  const [active, allowedHosts, sitePrefixes] = yield* Effect.all(
    [
      Effect.promise(() => isGeoIngestIdentityActive(identity)),
      Effect.promise(() => loadIngestAllowedHosts(identity)),
      identity.site
        ? Effect.succeed(null)
        : Effect.promise(() =>
            loadOrganizationSitePrefixes(identity.organizationId)
          ),
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
    return droppedResult(
      identity,
      classification.visitorType,
      "host",
      url.hostname
    );
  }
  if (sitePrefixes && isServedBySite(url, sitePrefixes)) {
    return droppedResult(
      identity,
      classification.visitorType,
      "site",
      url.hostname
    );
  }

  const capturedAt = toCapturedDate(payload.timestamp);
  const webRow = countsVisitors
    ? yield* Effect.promise(() =>
        buildWebPageView({
          identity,
          payload,
          url,
          capturedAt,
          classification,
        }).catch(() => null)
      )
    : null;
  if (webRow) {
    yield* storeWebPageView(webRow, buffer);
  }
  if (!isAi) {
    return {
      outcome: "ingested",
      organizationId: identity.organizationId,
      projectId: identity.projectId,
      visitorType: classification.visitorType,
      source: "",
      agent: "",
      ingestMs: 0,
    } satisfies GeoIngestResult;
  }

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
  // A buffered event is acknowledged before it reaches Tinybird; the batcher
  // retries failed writes and announces rows once written. Without a buffer
  // (or when it is full) the 202 still waits for the write.
  const buffered = buffer?.enqueue(event) ?? false;
  if (!buffered) {
    yield* ingestEvent(event);
  }
  const ingestMs = Date.now() - ingestStartedAt;
  // Analytics and the live update must not hold the 202 open for the site
  // that sent the event.
  yield* Effect.sync(() =>
    defer(async () => {
      const announced =
        buffered && buffer
          ? expediteForLiveViewers(buffer, event.organization_id)
          : announceGeoTrafficEvent(event.organization_id, event.project_id);
      try {
        await Effect.runPromise(trackGeoIngestAnalytics({ identity, event }));
      } catch (error) {
        logGeoFailure(
          "geo.ingest.analytics_failed",
          "Deferred ingest analytics failed",
          error,
          {
            organizationId: identity.organizationId,
            projectId: identity.projectId,
          }
        );
      }
      await announced;
    })
  );

  return {
    outcome: "ingested",
    organizationId: identity.organizationId,
    projectId: identity.projectId,
    visitorType: classification.visitorType,
    source: classification.source,
    agent: classification.agent,
    ingestMs,
  } satisfies GeoIngestResult;
});
