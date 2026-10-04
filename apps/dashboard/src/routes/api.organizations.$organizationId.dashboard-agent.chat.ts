import { createFileRoute } from "@tanstack/react-router";

import { dispatchRouteHandler } from "@/lib/auth/route-handler";

export const Route = createFileRoute(
  "/api/organizations/$organizationId/dashboard-agent/chat"
)({
  server: {
    handlers: {
      ANY: async ({ request, params }) => {
        const handlers =
          await import("@/app/api/organizations/[organizationId]/dashboard-agent/chat/route");
        return dispatchRouteHandler(handlers, request, params);
      },
    },
  },
});
