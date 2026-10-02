import { createFileRoute } from "@tanstack/react-router";

import { dispatchRouteHandler } from "@/lib/auth/route-handler";

export const Route = createFileRoute("/api/brand-font/css")({
  server: {
    handlers: {
      ANY: async ({ request, params }) => {
        const handlers = await import("@/app/api/brand-font/css/route");
        return dispatchRouteHandler(handlers, request, params);
      },
    },
  },
});
