import { createFileRoute } from "@tanstack/react-router";

import { dispatchRouteHandler } from "@/lib/auth/route-handler";
import { requestLogMiddleware } from "@/middleware/request-log";

export const Route = createFileRoute(
  "/api/organizations/$organizationId/agent/$"
)({
  server: {
    middleware: [requestLogMiddleware],
    handlers: {
      ANY: async (ctx) => {
        const { log } = ctx.context;
        log.set({
          routeId: "/api/organizations/$organizationId/agent/$",
        });
        const handlers =
          await import("@/app/api/organizations/[organizationId]/agent/[...eve]/route");
        return dispatchRouteHandler(handlers, ctx.request, {
          ...ctx.params,
          eve: ctx.params._splat?.split("/"),
        });
      },
    },
  },
});
