import { createFileRoute } from "@tanstack/react-router";

import { dispatchRouteHandler } from "@/lib/auth/route-handler";
import { requestLogMiddleware } from "@/middleware/request-log";

export const Route = createFileRoute(
  "/api/organizations/$organizationId/dashboard-agent/chat/$chatId"
)({
  server: {
    middleware: [requestLogMiddleware],
    handlers: {
      ANY: async (ctx) => {
        const { log } = ctx.context;
        log.set({
          routeId:
            "/api/organizations/$organizationId/dashboard-agent/chat/$chatId",
        });
        const handlers =
          await import("@/app/api/organizations/[organizationId]/dashboard-agent/chat/[chatId]/route");
        return dispatchRouteHandler(handlers, ctx.request, ctx.params);
      },
    },
  },
});
