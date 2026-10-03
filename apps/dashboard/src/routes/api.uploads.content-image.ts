import { createFileRoute } from "@tanstack/react-router";

import { dispatchRouteHandler } from "@/lib/auth/route-handler";

export const Route = createFileRoute("/api/uploads/content-image")({
  server: {
    handlers: {
      ANY: async ({ request, params }) => {
        const handlers = await import("@/app/api/uploads/content-image/route");
        return dispatchRouteHandler(handlers, request, params);
      },
    },
  },
});
