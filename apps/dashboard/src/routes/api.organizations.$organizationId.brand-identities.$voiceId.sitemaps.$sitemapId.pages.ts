import { createFileRoute } from "@tanstack/react-router";

import { dispatchRouteHandler } from "@/lib/auth/route-handler";

export const Route = createFileRoute(
  "/api/organizations/$organizationId/brand-identities/$voiceId/sitemaps/$sitemapId/pages"
)({
  server: {
    handlers: {
      ANY: async ({ request, params }) => {
        const handlers =
          await import("@/app/api/organizations/[organizationId]/brand-identities/[voiceId]/sitemaps/[sitemapId]/pages/route");
        return dispatchRouteHandler(handlers, request, params);
      },
    },
  },
});
