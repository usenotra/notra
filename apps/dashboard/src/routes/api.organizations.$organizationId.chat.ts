import { createFileRoute } from "@tanstack/react-router";

import { dispatchRouteHandler } from "@/lib/auth/route-handler";
import { requestLogMiddleware } from "@/middleware/request-log";

export const Route = createFileRoute("/api/organizations/$organizationId/chat")(
  {
    server: {
      middleware: [requestLogMiddleware],
      handlers: {
        ANY: async (ctx) => {
          const { log } = ctx.context;
          log.set({
            routeId: "/api/organizations/$organizationId/chat",
          });
          const handlers =
            await import("@/app/api/organizations/[organizationId]/chat/route");
          return dispatchRouteHandler(handlers, ctx.request, ctx.params);
        },
      },
    },
  }
);
