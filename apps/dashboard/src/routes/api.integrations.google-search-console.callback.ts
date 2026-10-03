import { createFileRoute } from "@tanstack/react-router";

import { dispatchRouteHandler } from "@/lib/auth/route-handler";

export const Route = createFileRoute(
  "/api/integrations/google-search-console/callback"
)({
  server: {
    handlers: {
      ANY: async ({ request, params }) => {
        const handlers =
          await import("@/app/api/integrations/google-search-console/callback/route");
        return dispatchRouteHandler(handlers, request, params);
      },
    },
  },
});
