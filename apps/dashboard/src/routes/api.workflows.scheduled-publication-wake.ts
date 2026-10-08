import { createFileRoute } from "@tanstack/react-router";

import { dispatchRouteHandler } from "@/lib/auth/route-handler";

export const Route = createFileRoute(
  "/api/workflows/scheduled-publication-wake"
)({
  server: {
    handlers: {
      ANY: async ({ request, params }) => {
        const handlers =
          await import("@/app/api/workflows/scheduled-publication-wake/route");
        return dispatchRouteHandler(handlers, request, params);
      },
    },
  },
});
