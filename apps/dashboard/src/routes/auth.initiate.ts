import { createFileRoute } from "@tanstack/react-router";

import { dispatchRouteHandler } from "@/lib/auth/route-handler";

export const Route = createFileRoute("/auth/initiate")({
  server: {
    handlers: {
      ANY: async ({ request, params }) => {
        const handlers = await import("@/app/auth/initiate/route");
        return dispatchRouteHandler(handlers, request, params);
      },
    },
  },
});
