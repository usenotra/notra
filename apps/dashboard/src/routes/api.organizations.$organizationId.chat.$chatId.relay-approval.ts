import { createFileRoute } from "@tanstack/react-router";

import { dispatchRouteHandler } from "@/lib/auth/route-handler";

export const Route = createFileRoute(
  "/api/organizations/$organizationId/chat/$chatId/relay-approval"
)({
  server: {
    handlers: {
      ANY: async ({ request, params }) => {
        const handlers =
          await import("@/app/api/organizations/[organizationId]/chat/[chatId]/relay-approval/route");
        return dispatchRouteHandler(handlers, request, params);
      },
    },
  },
});
