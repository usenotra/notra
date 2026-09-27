import type { GeoTrafficEventRow } from "@notra/analytics/tinybird/datasources";
import { toClickHouseDateTime } from "@notra/analytics/utils/datetime";
import { GEO_MAX_STORED_UA_LENGTH } from "@notra/geo-core/constants/geo";
import { GEO_MARKDOWN_ACCEPT_MATCHERS } from "@notra/geo-core/constants/geo-accept";

import type { GeoTrafficEventInput } from "../types/ingest";

export function toCapturedDate(timestamp: string | undefined): Date {
  const parsed = timestamp ? new Date(timestamp) : new Date();
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function toLanguage(acceptLanguage: string | undefined): string {
  const first = acceptLanguage?.split(",")[0]?.split(";")[0]?.trim();
  return first ?? "";
}

function wantsMarkdown(accept: string | undefined): boolean {
  const normalized = accept?.toLowerCase() ?? "";
  return GEO_MARKDOWN_ACCEPT_MATCHERS.some((matcher) =>
    normalized.includes(matcher)
  );
}

export function buildGeoTrafficEvent(
  input: GeoTrafficEventInput
): GeoTrafficEventRow {
  const {
    organizationId,
    projectId,
    payload,
    url,
    capturedAt,
    classification,
    journey,
  } = input;

  return {
    organization_id: organizationId,
    project_id: projectId ?? "",
    captured_at: toClickHouseDateTime(capturedAt),
    visitor_type: classification.visitorType,
    source: classification.source,
    agent: classification.agent,
    category: classification.category,
    confidence: classification.confidence,
    path: journey.path,
    host: url.hostname,
    method: payload.method.toUpperCase(),
    referer: payload.referer ?? "",
    ua: (payload.userAgent ?? "").slice(0, GEO_MAX_STORED_UA_LENGTH),
    country: payload.geo?.country ?? "",
    language: toLanguage(payload.acceptLanguage),
    request_id: payload.requestId ?? "",
    journey_id: journey.journeyId,
    wants_markdown: wantsMarkdown(payload.accept),
  };
}
