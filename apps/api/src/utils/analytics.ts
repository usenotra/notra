import { httpErrorKind } from "@notra/ai/utils/http-error-kind";
import { logOperationalEvent } from "@notra/ai/utils/operational-log";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import {
  captureServerEvent,
  captureServerException,
} from "@notra/posthog/server";
import { getRequiredApiScope } from "@notra/utils/api-scopes";
import type { Context } from "hono";

import {
  API_AUTH_KINDS,
  API_FEEDBACK_VIA,
  API_REQUEST_ERROR_STATUS_THRESHOLD,
  API_REQUEST_GET_SAMPLE_RATE,
  API_ROUTE_ID_UNMATCHED,
  API_SDK_BUCKETS,
  API_SDK_USER_AGENT_PATTERNS,
} from "../constants/analytics";
import type {
  ApiAuthKind,
  ApiEventInput,
  ApiKeyRejectedInput,
  ApiPaywalledInput,
  ApiRateLimitedInput,
  ApiSdkBucket,
  FeedbackReceivedInput,
} from "../types/analytics";
import { type AuthData, isIngestAuth } from "../types/auth";

function bucketSdkFromUserAgent(userAgent: string | undefined): ApiSdkBucket {
  if (!userAgent) {
    return API_SDK_BUCKETS.OTHER;
  }
  for (const { sdk, pattern } of API_SDK_USER_AGENT_PATTERNS) {
    if (pattern.test(userAgent)) {
      return sdk;
    }
  }
  return API_SDK_BUCKETS.OTHER;
}

function resolveApiRouteId(c: Context): string {
  let routeId: string | undefined;
  for (const route of c.req.matchedRoutes) {
    if (route.method !== "ALL") {
      routeId = route.path;
    }
  }
  return routeId ?? API_ROUTE_ID_UNMATCHED;
}

function readAuth(c: Context): AuthData | undefined {
  const auth: AuthData | undefined = c.get("auth");
  return auth;
}

function resolveAuthKind(auth: AuthData | undefined): ApiAuthKind | undefined {
  if (!auth) {
    return undefined;
  }
  if (isIngestAuth(auth)) {
    return API_AUTH_KINDS.FEEDBACK_TOKEN;
  }
  if ("type" in auth && auth.type === "oauth") {
    return API_AUTH_KINDS.OAUTH;
  }
  return API_AUTH_KINDS.UNKEY;
}

function shouldTrackApiRequest(method: string, status: number): boolean {
  if (method !== "GET" || status >= API_REQUEST_ERROR_STATUS_THRESHOLD) {
    return true;
  }
  return Math.random() < API_REQUEST_GET_SAMPLE_RATE;
}

function safeOrganizationId(c: Context): string | null {
  return readAuth(c)?.identity?.externalId ?? null;
}

function safeGeoProjectId(c: Context): string | null {
  try {
    const geo: { projectId?: string | null } | undefined = c.get("geo");
    return geo?.projectId ?? null;
  } catch {
    return null;
  }
}

function baseRequestProperties(c: Context) {
  const pathname = new URL(c.req.url).pathname;
  return {
    route_id: resolveApiRouteId(c),
    method: c.req.method,
    scope: getRequiredApiScope(pathname, c.req.method) ?? undefined,
    sdk: bucketSdkFromUserAgent(c.req.header("user-agent")),
  };
}

export function trackApiEvent(c: Context, input: ApiEventInput): void {
  try {
    captureServerEvent({
      event: input.event,
      organizationId: input.organizationId ?? safeOrganizationId(c),
      projectId: input.projectId,
      properties: {
        ...baseRequestProperties(c),
        ...input.properties,
      },
    });
  } catch (error) {
    console.error("[posthog] api event capture failed", error);
  }
}

export function trackApiRequest(c: Context, latencyMs: number): void {
  try {
    const status = c.res.status;
    if (!shouldTrackApiRequest(c.req.method, status)) {
      return;
    }
    const auth = readAuth(c);
    captureServerEvent({
      event: POSTHOG_EVENTS.API_REQUEST,
      organizationId: safeOrganizationId(c),
      projectId: safeGeoProjectId(c),
      properties: {
        ...baseRequestProperties(c),
        status,
        latency_ms: latencyMs,
        key_id: auth?.keyId ?? undefined,
        auth_kind: resolveAuthKind(auth),
        sampled:
          c.req.method === "GET" && status < API_REQUEST_ERROR_STATUS_THRESHOLD,
      },
    });
  } catch (error) {
    console.error("[posthog] api request capture failed", error);
  }
}

export function logApiRequest(c: Context, durationMs: number): void {
  logOperationalEvent({
    event: "api.request.completed",
    surface: "api",
    method: c.req.method,
    routeId: resolveApiRouteId(c),
    status: c.res.status,
    outcome: c.res.status >= 400 ? "error" : "success",
    errorKind: httpErrorKind(c.res.status),
    durationMs,
    organizationId: safeOrganizationId(c),
    projectId: safeGeoProjectId(c),
  });
}

export function trackApiException(
  c: Context,
  error: unknown,
  status: number
): void {
  try {
    captureServerException({
      error,
      organizationId: safeOrganizationId(c),
      properties: {
        ...baseRequestProperties(c),
        status,
        surface: "api",
      },
    });
  } catch (captureError) {
    console.error("[posthog] api exception capture failed", captureError);
  }
}

export function trackApiKeyVerified(c: Context, auth: AuthData): void {
  trackApiEvent(c, {
    event: POSTHOG_EVENTS.API_KEY_VERIFIED,
    organizationId: auth.identity?.externalId ?? null,
    properties: {
      auth_kind: resolveAuthKind(auth),
      key_id: auth.keyId ?? undefined,
    },
  });
}

export function trackApiKeyRejected(
  c: Context,
  input: ApiKeyRejectedInput
): void {
  trackApiEvent(c, {
    event: POSTHOG_EVENTS.API_KEY_REJECTED,
    organizationId: null,
    properties: {
      auth_kind: input.authKind,
      status: input.status,
      reason: input.reason,
      unkey_code: input.unkeyCode,
    },
  });
}

export function trackApiRateLimited(
  c: Context,
  input: ApiRateLimitedInput
): void {
  const auth = readAuth(c);
  trackApiEvent(c, {
    event: POSTHOG_EVENTS.API_RATE_LIMITED,
    projectId: safeGeoProjectId(c),
    properties: {
      limit: input.limit,
      key_id: auth?.keyId ?? undefined,
      auth_kind: resolveAuthKind(auth),
    },
  });
}

export function trackApiPaywalled(c: Context, input: ApiPaywalledInput): void {
  trackApiEvent(c, {
    event: POSTHOG_EVENTS.API_PAYWALLED,
    properties: {
      feature: input.feature,
      status: input.status,
      surface: "api",
    },
  });
}

export function trackFeedbackReceived(
  c: Context,
  input: FeedbackReceivedInput
): void {
  const properties = {
    kind: input.feedback.kind,
    sentiment: input.feedback.sentiment ?? undefined,
    classifier_label: input.feedback.kind,
    source: input.feedback.source,
    has_title: Boolean(input.feedback.title),
    deduplicated: input.deduplicated,
    via: input.via,
  };
  trackApiEvent(c, {
    event: POSTHOG_EVENTS.AGENT_FEEDBACK_RECEIVED,
    organizationId: input.organizationId,
    projectId: input.feedback.projectId,
    properties,
  });
  if (input.via === API_FEEDBACK_VIA.PUBLIC_SLUG) {
    trackApiEvent(c, {
      event: POSTHOG_EVENTS.SDK_FEEDBACK_TOOL_CALLED,
      organizationId: input.organizationId,
      projectId: input.feedback.projectId,
      properties,
    });
  }
}
