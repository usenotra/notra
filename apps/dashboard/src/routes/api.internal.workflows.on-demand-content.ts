import { createFileRoute } from "@tanstack/react-router";

import { dispatchRouteHandler } from "@/lib/auth/route-handler";

export const Route = createFileRoute(
  "/api/internal/workflows/on-demand-content"
)({
  server: {
    handlers: {
      ANY: async ({ request, params }) => {
        const handlers =
          await import("@/app/api/internal/workflows/on-demand-content/route");
        return dispatchRouteHandler(handlers, request, params);
      },
    },
  },
});
