import { createFileRoute } from "@tanstack/react-router";

import { dispatchRouteHandler } from "@/lib/auth/route-handler";

export const Route = createFileRoute("/api/cron/geo-scan")({
  server: {
    handlers: {
      ANY: async ({ request, params }) => {
        const handlers = await import("@/app/api/cron/geo-scan/route");
        return dispatchRouteHandler(handlers, request, params);
      },
    },
  },
});
