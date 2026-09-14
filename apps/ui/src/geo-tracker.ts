import { createGeoHandler } from "@usenotra/geo/netlify";

const token = process.env.NOTRA_GEO_TOKEN?.trim();
const endpoint = process.env.NOTRA_GEO_ENDPOINT?.trim() || undefined;

const trackGeoRequestWithToken = token
  ? createGeoHandler({ token, endpoint })
  : null;

interface GeoMiddlewareContext {
  waitUntil?(promise: Promise<unknown>): void;
}

export function trackGeoRequest(
  request: Request,
  context?: GeoMiddlewareContext
): void {
  trackGeoRequestWithToken?.(request, context);
}
