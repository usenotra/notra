import { createFileRoute } from "@tanstack/react-router";

import { dispatchRouteHandler } from "@/lib/auth/route-handler";

export const Route = createFileRoute("/api/demo/sandbox/info")({
  server: {
    handlers: {
      ANY: async ({ request, params }) => {
        const handlers = await import("@/app/api/demo/sandbox/info/route");
        return dispatchRouteHandler(handlers, request, params);
      },
    },
  },
});
