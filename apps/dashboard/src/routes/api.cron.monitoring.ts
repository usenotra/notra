import { createFileRoute } from "@tanstack/react-router";

import { dispatchRouteHandler } from "@/lib/auth/route-handler";

export const Route = createFileRoute("/api/cron/monitoring")({
  server: {
    handlers: {
      ANY: async ({ request, params }) => {
        const handlers = await import("@/app/api/cron/monitoring/route");
        return dispatchRouteHandler(handlers, request, params);
      },
    },
  },
});
