import { APP_URL, DEMO_URL } from "./urls";

const LOCAL_DASHBOARD_ORIGIN = "http://localhost:3000";

export function buildSecurityHeaders(isDevelopment: boolean) {
  const dashboardSessionOrigin = isDevelopment
    ? LOCAL_DASHBOARD_ORIGIN
    : APP_URL;

  return {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
    "X-DNS-Prefetch-Control": "on",
    "Content-Security-Policy": [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' databuddy.cc *.databuddy.cc https://challenges.cloudflare.com",
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self'",
      "img-src 'self' data: blob: databuddy.cc *.databuddy.cc avatars.githubusercontent.com www.google.com *.gstatic.com cdn.contentport.io media.brand.dev *.r2.dev cdn.usenotra.com pbs.twimg.com abs.twimg.com",
      `connect-src 'self' databuddy.cc *.databuddy.cc *.inth.app *.c15t.com *.c15t.dev ${dashboardSessionOrigin}`,
      `frame-src https://challenges.cloudflare.com ${DEMO_URL}`,
      "frame-ancestors 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests",
    ].join("; "),
  };
}
