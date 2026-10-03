import { createFileRoute } from "@tanstack/react-router";

import { dispatchRouteHandler } from "@/lib/auth/route-handler";

export const Route = createFileRoute("/api/workflows/social-analytics-sync")({
  server: {
    handlers: {
      ANY: async ({ request, params }) => {
        const handlers =
          await import("@/app/api/workflows/social-analytics-sync/route");
        return dispatchRouteHandler(handlers, request, params);
      },
    },
  },
});
