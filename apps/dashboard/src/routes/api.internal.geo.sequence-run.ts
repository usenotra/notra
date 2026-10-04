import { createFileRoute } from "@tanstack/react-router";

import { dispatchRouteHandler } from "@/lib/auth/route-handler";

export const Route = createFileRoute("/api/internal/geo/sequence-run")({
  server: {
    handlers: {
      ANY: async ({ request, params }) => {
        const handlers =
          await import("@/app/api/internal/geo/sequence-run/route");
        return dispatchRouteHandler(handlers, request, params);
      },
    },
  },
});
