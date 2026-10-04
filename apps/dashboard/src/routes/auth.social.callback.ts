import { createFileRoute } from "@tanstack/react-router";

import { dispatchRouteHandler } from "@/lib/auth/route-handler";

export const Route = createFileRoute("/auth/social/callback")({
  server: {
    handlers: {
      ANY: async ({ request, params }) => {
        const handlers = await import("@/app/auth/social/callback/route");
        return dispatchRouteHandler(handlers, request, params);
      },
    },
  },
});
