import { trackGeoRequest } from "./src/geo-tracker";

export default function middleware(request: Request) {
  trackGeoRequest(request);
}

export const config = {
  matcher: [
    "/((?!_astro/|favicon\\.svg|.*\\.(?:css|js|png|svg|webp|woff2?|ico)$).*)",
  ],
};
