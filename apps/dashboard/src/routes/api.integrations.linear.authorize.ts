import { createFileRoute } from "@tanstack/react-router";

import { dispatchRouteHandler } from "@/lib/auth/route-handler";

export const Route = createFileRoute("/api/integrations/linear/authorize")({
  server: {
    handlers: {
      ANY: async ({ request, params }) => {
        const handlers =
          await import("@/app/api/integrations/linear/authorize/route");
        return dispatchRouteHandler(handlers, request, params);
      },
    },
  },
});
