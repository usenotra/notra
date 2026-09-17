// Everything else belongs to the dashboard's /[slug] route. These routes
// either are public or enforce their own authentication (API/RPC/onboarding).
export const NON_DASHBOARD_PATH =
  /^\/(?:$|(?:api|rpc|auth|callback|login|signup|forgot-password|reset-password|onboarding|connect|integrations|design-system|ingest|eve|_next|\.well-known|badges|brands|testimonials)(?:\/|$)|[^/]+\.[^/]+$)/;
