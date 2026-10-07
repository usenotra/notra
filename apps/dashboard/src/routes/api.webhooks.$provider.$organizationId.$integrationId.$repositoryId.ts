import { createFileRoute } from "@tanstack/react-router";

import { dispatchRouteHandler } from "@/lib/auth/route-handler";
import { requestLogMiddleware } from "@/middleware/request-log";

export const Route = createFileRoute(
  "/api/webhooks/$provider/$organizationId/$integrationId/$repositoryId"
)({
  server: {
    middleware: [requestLogMiddleware],
    handlers: {
      ANY: async (ctx) => {
        const { log } = ctx.context;
        log.set({
          routeId:
            "/api/webhooks/$provider/$organizationId/$integrationId/$repositoryId",
        });
        const handlers =
          await import("@/app/api/webhooks/[provider]/[organizationId]/[integrationId]/[repositoryId]/route");
        return dispatchRouteHandler(handlers, ctx.request, ctx.params);
      },
    },
  },
});
