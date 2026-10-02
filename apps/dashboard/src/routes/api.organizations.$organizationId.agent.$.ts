import { createFileRoute } from "@tanstack/react-router";

import { dispatchRouteHandler } from "@/lib/auth/route-handler";

export const Route = createFileRoute(
  "/api/organizations/$organizationId/agent/$"
)({
  server: {
    handlers: {
      ANY: async ({ request, params }) => {
        const handlers =
          await import("@/app/api/organizations/[organizationId]/agent/[...eve]/route");
        return dispatchRouteHandler(handlers, request, {
          ...params,
          eve: params._splat?.split("/"),
        });
      },
    },
  },
});
