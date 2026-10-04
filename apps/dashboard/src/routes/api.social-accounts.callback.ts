import { createFileRoute } from "@tanstack/react-router";

import { dispatchRouteHandler } from "@/lib/auth/route-handler";

export const Route = createFileRoute("/api/social-accounts/callback")({
  server: {
    handlers: {
      ANY: async ({ request, params }) => {
        const handlers =
          await import("@/app/api/social-accounts/callback/route");
        return dispatchRouteHandler(handlers, request, params);
      },
    },
  },
});
