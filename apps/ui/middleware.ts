import { createGeoHandler } from "@usenotra/geo/netlify";

interface MiddlewareContext {
  waitUntil(promise: Promise<unknown>): void;
}

const token = process.env.NOTRA_GEO_TOKEN?.trim();
const endpoint = process.env.NOTRA_GEO_ENDPOINT?.trim() || undefined;

const trackGeoRequest = token ? createGeoHandler({ token, endpoint }) : null;

export default function middleware(
  request: Request,
  context: MiddlewareContext
) {
  trackGeoRequest?.(request, context);
}

export const config = {
  matcher: [
    "/((?!_astro/|favicon\\.svg|.*\\.(?:css|js|png|svg|webp|woff2?|ico)$).*)",
  ],
};
