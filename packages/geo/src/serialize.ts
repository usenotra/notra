import { PREFETCH_PURPOSE_HEADERS } from "./constants";
import type {
  GeoLocation,
  GeoRequestPayload,
  GeoRequestSignals,
} from "./types";

function header(headers: Headers, name: string): string | undefined {
  return headers.get(name) ?? undefined;
}

function decode(value: string | undefined): string | undefined {
  if (!value) {
    return;
  }
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function readIp(headers: Headers): string | undefined {
  const forwardedFor = headers.get("x-forwarded-for");
  const first = forwardedFor?.split(",")[0]?.trim();
  if (first) {
    return first;
  }
  return (
    header(headers, "x-real-ip") ?? header(headers, "x-vercel-forwarded-for")
  );
}

function readGeo(headers: Headers): GeoLocation | undefined {
  const location: GeoLocation = {
    country:
      header(headers, "x-vercel-ip-country") ?? header(headers, "cf-ipcountry"),
    region: header(headers, "x-vercel-ip-country-region"),
    city: decode(header(headers, "x-vercel-ip-city")),
    timezone: header(headers, "x-vercel-ip-timezone"),
    latitude: header(headers, "x-vercel-ip-latitude"),
    longitude: header(headers, "x-vercel-ip-longitude"),
  };

  const hasValue = Object.values(location).some((value) => value !== undefined);
  return hasValue ? location : undefined;
}

const TRACING_HEADERS = ["traceparent", "b3", "x-b3-traceid"];

function isPrefetch(headers: Headers): boolean {
  return (
    headers.has("next-router-prefetch") ||
    PREFETCH_PURPOSE_HEADERS.some((name) =>
      headers.get(name)?.toLowerCase().includes("prefetch")
    )
  );
}

function readSignals(headers: Headers): GeoRequestSignals {
  return {
    clientHints: headers.has("sec-ch-ua"),
    fetchMode: header(headers, "sec-fetch-mode") ?? null,
    tracing: TRACING_HEADERS.some((name) => headers.has(name)),
    prefetch: isPrefetch(headers),
  };
}

export function serializeRequest(request: Request): GeoRequestPayload {
  const { headers } = request;

  return {
    timestamp: new Date().toISOString(),
    method: request.method,
    url: request.url,
    ip: readIp(headers),
    geo: readGeo(headers),
    referer: header(headers, "referer"),
    userAgent: header(headers, "user-agent"),
    accept: header(headers, "accept"),
    acceptLanguage: header(headers, "accept-language"),
    requestId:
      header(headers, "x-request-id") ?? header(headers, "x-vercel-id"),
    signals: readSignals(headers),
  };
}
