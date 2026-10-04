import { createFileRoute } from "@tanstack/react-router";

import { dispatchRouteHandler } from "@/lib/auth/route-handler";

export const Route = createFileRoute(
  "/api/internal/workflows/content-publication-sync-repair"
)({
  server: {
    handlers: {
      ANY: async ({ request, params }) => {
        const handlers =
          await import("@/app/api/internal/workflows/content-publication-sync-repair/route");
        return dispatchRouteHandler(handlers, request, params);
      },
    },
  },
});
