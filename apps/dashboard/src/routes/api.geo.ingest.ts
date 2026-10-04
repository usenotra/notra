import { createFileRoute } from "@tanstack/react-router";

import { dispatchRouteHandler } from "@/lib/auth/route-handler";

export const Route = createFileRoute("/api/geo/ingest")({
  server: {
    handlers: {
      ANY: async ({ request, params }) => {
        const handlers = await import("@/app/api/geo/ingest/route");
        return dispatchRouteHandler(handlers, request, params);
      },
    },
  },
});
