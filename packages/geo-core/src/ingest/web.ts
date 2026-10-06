import { createHmac } from "node:crypto";

import { redis } from "@notra/ai/utils/redis";
import type { WebPageViewRow } from "@notra/analytics/tinybird/datasources";
import { toClickHouseDateTime } from "@notra/analytics/utils/datetime";
import { GEO_NON_AI_BOT_PATTERNS } from "@notra/geo-core/constants/geo";
import {
  ISO_DATE_LENGTH,
  WEB_AI_PRODUCTS,
  WEB_BROWSERS,
  WEB_MACHINE_PATH_PATTERN,
  WEB_OPERATING_SYSTEMS,
  WEB_SEARCH_HOSTS,
  WEB_SESSION_KEY_PREFIX,
  WEB_SESSION_TTL_SECONDS,
  WEB_SOCIAL_HOSTS,
  WEB_VISITOR_ID_LENGTH,
} from "@notra/geo-core/constants/web-analytics";
import { getGeoIngestSecret } from "@notra/geo-core/geo/ingest";
import { urlHost } from "@notra/geo-core/utils/url-host";

import type {
  WebPageViewInput,
  WebReferrer,
  WebSession,
} from "../types/ingest";

export function isHumanPageView(
  input: Pick<WebPageViewInput, "classification" | "payload" | "url">
): boolean {
  const { classification, payload, url } = input;
  if (
    classification.visitorType !== "human" &&
    classification.visitorType !== "ai_referral"
  ) {
    return false;
  }
  if (payload.method.toUpperCase() !== "GET" || payload.signals?.prefetch) {
    return false;
  }
  if (
    payload.status !== undefined &&
    payload.status >= 300 &&
    payload.status !== 404
  ) {
    return false;
  }
  const userAgent = payload.userAgent?.toLowerCase() ?? "";
  if (GEO_NON_AI_BOT_PATTERNS.some((pattern) => userAgent.includes(pattern))) {
    return false;
  }
  return !WEB_MACHINE_PATH_PATTERN.test(url.pathname);
}

export function webVisitorId(
  scope: string,
  ip: string | undefined,
  userAgent: string | undefined,
  capturedAt: Date
): string {
  const secret = getGeoIngestSecret() ?? "";
  const day = capturedAt.toISOString().slice(0, ISO_DATE_LENGTH);
  return createHmac("sha256", `${secret}|web|${day}`)
    .update(`${scope}|${ip ?? ""}|${userAgent ?? ""}`)
    .digest("hex")
    .slice(0, WEB_VISITOR_ID_LENGTH);
}

async function resolveSession(
  visitorId: string,
  origin: string | null
): Promise<WebSession> {
  const client = redis;
  if (!client) {
    return { id: visitorId, index: 0 };
  }
  const key = `${WEB_SESSION_KEY_PREFIX}:${visitorId}`;
  const current = await client.get<WebSession>(key).catch(() => null);
  const continues =
    current !== null && (origin === null || current.origin === origin);
  const next: WebSession = continues
    ? { id: current.id, index: current.index + 1, origin: current.origin }
    : {
        id: crypto
          .randomUUID()
          .replaceAll("-", "")
          .slice(0, WEB_VISITOR_ID_LENGTH),
        index: 1,
        origin: origin ?? "",
      };
  await client
    .set(key, next, { ex: WEB_SESSION_TTL_SECONDS })
    .catch(() => null);
  return next;
}

function matchHost(host: string, table: Record<string, string>): string | null {
  for (const [pattern, name] of Object.entries(table)) {
    if (pattern.endsWith(".")) {
      if (host.startsWith(pattern) || host.includes(`.${pattern}`)) {
        return name;
      }
    } else if (host === pattern || host.endsWith(`.${pattern}`)) {
      return name;
    }
  }
  return null;
}

export function classifyWebReferrer(
  referer: string | undefined,
  pageHost: string,
  aiSource: string | null
): WebReferrer {
  const host = referer ? (urlHost(referer) ?? "") : "";
  if (aiSource) {
    return {
      host,
      group: "ai",
      source: aiSource,
      aiProduct: WEB_AI_PRODUCTS[aiSource] ?? aiSource,
    };
  }
  if (!host) {
    return { host: "", group: "direct", source: "", aiProduct: "" };
  }
  const bare = host.replace(/^www\./, "");
  if (bare === pageHost.replace(/^www\./, "")) {
    return { host, group: "internal", source: "", aiProduct: "" };
  }
  const search = matchHost(bare, WEB_SEARCH_HOSTS);
  if (search) {
    return { host, group: "search", source: search, aiProduct: "" };
  }
  const social = matchHost(bare, WEB_SOCIAL_HOSTS);
  if (social) {
    return { host, group: "social", source: social, aiProduct: "" };
  }
  return { host, group: "other", source: bare, aiProduct: "" };
}

function firstMatch(
  userAgent: string,
  table: readonly [string, string][],
  fallback: string
): string {
  for (const [fragment, name] of table) {
    if (userAgent.includes(fragment)) {
      return name;
    }
  }
  return fallback;
}

export function describeUserAgent(raw: string | undefined) {
  const userAgent = raw?.toLowerCase() ?? "";
  let device = "desktop";
  if (userAgent.includes("ipad") || userAgent.includes("tablet")) {
    device = "tablet";
  } else if (userAgent.includes("mobi") || userAgent.includes("iphone")) {
    device = "mobile";
  }
  return {
    device,
    browser: firstMatch(userAgent, WEB_BROWSERS, "Other"),
    os: firstMatch(userAgent, WEB_OPERATING_SYSTEMS, "Other"),
  };
}

export async function buildWebPageView(
  input: WebPageViewInput
): Promise<WebPageViewRow | null> {
  if (!isHumanPageView(input)) {
    return null;
  }
  const { identity, payload, url, capturedAt, classification } = input;
  const scope =
    identity.site?.id ?? identity.projectId ?? identity.organizationId;
  const visitorId = webVisitorId(
    scope,
    payload.ip,
    payload.userAgent,
    capturedAt
  );
  const referrer = classifyWebReferrer(
    payload.referer,
    url.hostname.toLowerCase(),
    classification.visitorType === "ai_referral" ? classification.source : null
  );
  const params = url.searchParams;
  const utmSource = (params.get("utm_source") ?? "")
    .slice(0, 100)
    .toLowerCase();
  const fromOutside =
    utmSource.length > 0 ||
    (referrer.group !== "direct" && referrer.group !== "internal");
  const session = await resolveSession(
    visitorId,
    fromOutside ? `${utmSource}|${referrer.group}|${referrer.source}` : null
  );
  const agent = describeUserAgent(payload.userAgent);
  return {
    organization_id: identity.organizationId,
    project_id: identity.projectId ?? "",
    site_id: identity.site?.id ?? "",
    captured_at: toClickHouseDateTime(capturedAt),
    host: url.hostname.toLowerCase(),
    path: url.pathname,
    status: payload.status ?? 200,
    visitor_id: visitorId,
    session_id: session.id,
    session_page_index: session.index,
    referrer_host: referrer.host,
    referrer_group: referrer.group,
    referrer_source: referrer.source,
    ai_product: referrer.aiProduct,
    utm_source: utmSource,
    utm_medium: (params.get("utm_medium") ?? "").slice(0, 100).toLowerCase(),
    utm_campaign: (params.get("utm_campaign") ?? "").slice(0, 200),
    country: payload.geo?.country ?? "",
    device: agent.device,
    browser: agent.browser,
    os: agent.os,
    request_id: payload.requestId ?? "",
  };
}
