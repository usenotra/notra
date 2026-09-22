// Everything else belongs to the dashboard's /[slug] route. These routes
// either are public or enforce their own authentication (API/RPC/onboarding).
export const NON_DASHBOARD_PATH =
  /^\/(?:$|(?:api|rpc|auth|callback|login|signup|s|forgot-password|reset-password|onboarding|connect|integrations|design-system|ingest|eve|_next|\.well-known|badges|brands|testimonials)(?:\/|$)|(?:(?:window|globe|next|vercel|file|icon0)\.svg|(?:web-app-manifest-(?:192x192|512x512)|apple-icon|icon1)\.png|favicon\.ico|robots\.txt)$)/;
