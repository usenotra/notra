import { createFileRoute } from "@tanstack/react-router";

import { dispatchRouteHandler } from "@/lib/auth/route-handler";

export const Route = createFileRoute(
  "/api/webhooks/$provider/$organizationId/$integrationId/$repositoryId"
)({
  server: {
    handlers: {
      ANY: async ({ request, params }) => {
        const handlers =
          await import("@/app/api/webhooks/[provider]/[organizationId]/[integrationId]/[repositoryId]/route");
        return dispatchRouteHandler(handlers, request, params);
      },
    },
  },
});
