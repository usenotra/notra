import { createFileRoute } from "@tanstack/react-router";

import { dispatchRouteHandler } from "@/lib/auth/route-handler";

export const Route = createFileRoute("/api/integrations/slack/callback")({
  server: {
    handlers: {
      ANY: async ({ request, params }) => {
        const handlers =
          await import("@/app/api/integrations/slack/callback/route");
        return dispatchRouteHandler(handlers, request, params);
      },
    },
  },
});
