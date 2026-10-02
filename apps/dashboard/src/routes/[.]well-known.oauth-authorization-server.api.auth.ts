import { createFileRoute } from "@tanstack/react-router";

import { dispatchRouteHandler } from "@/lib/auth/route-handler";

export const Route = createFileRoute(
  "/.well-known/oauth-authorization-server/api/auth"
)({
  server: {
    handlers: {
      ANY: async ({ request, params }) => {
        const handlers =
          await import("@/app/.well-known/oauth-authorization-server/api/auth/route");
        return dispatchRouteHandler(handlers, request, params);
      },
    },
  },
});
