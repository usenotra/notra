import { handleSiteRequest } from "./handler";
import type { SitesEnv } from "./types";

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
    const edgeCache = (caches as unknown as { default: Cache }).default;
    return await handleSiteRequest(request, {
      bucket: env.SITES_BUCKET,
      cache: {
        match: async (key) => (await edgeCache.match(key)) ?? undefined,
        put: (key, response) => edgeCache.put(key, response),
      },
      hostingDomain: env.HOSTING_DOMAIN,
      dashboardUrl: env.DASHBOARD_URL,
      previewSecret: env.PREVIEW_SECRET,
      devHostOverrideToken: env.DEV_HOST_OVERRIDE_TOKEN ?? null,
      waitUntil: (promise) => ctx.waitUntil(promise),
      now: () => new Date(),
    });
  },
} satisfies ExportedHandler<SitesEnv>;
