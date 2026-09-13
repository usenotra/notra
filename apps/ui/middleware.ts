import { trackGeoRequest } from "./src/geo-tracker";

interface MiddlewareContext {
  waitUntil(promise: Promise<unknown>): void;
}

export default function middleware(
  request: Request,
  context: MiddlewareContext
) {
  trackGeoRequest(request, context);
}

export const config = {
  matcher: [
    "/((?!_astro/|favicon\\.svg|.*\\.(?:css|js|png|svg|webp|woff2?|ico)$).*)",
  ],
};
