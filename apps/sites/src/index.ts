import { handleSiteRequest } from "./handler";
import type { SitesEnv } from "./types/worker";

export default {
  async fetch(
    request: Request,
    env: SitesEnv,
    ctx: ExecutionContext
  ): Promise<Response> {
    if (!env.PREVIEW_SECRET) {
      return new Response("Sites worker is missing PREVIEW_SECRET", {
        status: 500,
      });
    }
    return await handleSiteRequest(request, {
      bucket: env.SITES_BUCKET,
      cache: caches.default,
      hostingDomain: env.HOSTING_DOMAIN,
      dashboardUrl: env.DASHBOARD_URL,
      previewSecret: env.PREVIEW_SECRET,
      devHostOverrideToken: env.DEV_HOST_OVERRIDE_TOKEN ?? null,
      passwordAttemptLimiter: env.PREVIEW_PASSWORD_LIMITER ?? null,
      trafficIngestUrl: env.TRAFFIC_INGEST_URL || null,
      fetch: (url, init) => fetch(url, init),
      waitUntil: (promise) => ctx.waitUntil(promise),
      now: () => new Date(),
    });
  },
} satisfies ExportedHandler<SitesEnv>;
