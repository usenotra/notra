import { createFileRoute } from "@tanstack/react-router";

import { dispatchRouteHandler } from "@/lib/auth/route-handler";

export const Route = createFileRoute("/api/webhooks/github/app")({
  server: {
    handlers: {
      ANY: async ({ request, params }) => {
        const handlers = await import("@/app/api/webhooks/github/app/route");
        return dispatchRouteHandler(handlers, request, params);
      },
    },
  },
});
