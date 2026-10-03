export const DASHBOARD_SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "X-DNS-Prefetch-Control": "on",
};

export const DASHBOARD_FUNCTION_RULES = {
  "/api/uploads/content-image": { maxDuration: 30 },
  "/api/uploads/convert-heic": { maxDuration: 30 },
  "/api/demo/sandbox": { maxDuration: 60 },
  "/api/demo/sandbox/reset": { maxDuration: 60 },
  "/api/demo/sandbox/customize": { maxDuration: 60 },
  "/api/demo/enter": { maxDuration: 60 },
  "/api/organizations/*/dashboard-agent/chat": { maxDuration: 1800 },
  "/api/cron/monitoring": { maxDuration: 120 },
  "/api/cron/geo-scan": { maxDuration: 300 },
  "/api/organizations/*/content/*/chat": { maxDuration: 60 },
  "/api/cron/geo-content-gaps": { maxDuration: 300 },
  "/api/cron/daily-summary": { maxDuration: 60 },
  "/api/organizations/*/chat": { maxDuration: 1800 },
  "/api/command-palette/navigate": { maxDuration: 15 },
  "/api/organizations/*/agent/**": { maxDuration: 800 },
};

export const ORGANIZATION_COOKIE_SLUG_PATTERN = /^[a-z0-9-]+$/;
