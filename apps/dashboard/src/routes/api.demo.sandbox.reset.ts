import { createFileRoute } from "@tanstack/react-router";

import { dispatchRouteHandler } from "@/lib/auth/route-handler";

export const Route = createFileRoute("/api/demo/sandbox/reset")({
  server: {
    handlers: {
      ANY: async ({ request, params }) => {
        const handlers = await import("@/app/api/demo/sandbox/reset/route");
        return dispatchRouteHandler(handlers, request, params);
      },
    },
  },
});
