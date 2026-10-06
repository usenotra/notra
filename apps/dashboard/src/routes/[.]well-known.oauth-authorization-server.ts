import { createFileRoute } from "@tanstack/react-router";

import { dispatchRouteHandler } from "@/lib/auth/route-handler";
import { requestLogMiddleware } from "@/middleware/request-log";

export const Route = createFileRoute("/.well-known/oauth-authorization-server")(
  {
    server: {
      middleware: [requestLogMiddleware],
      handlers: {
        ANY: async (ctx) => {
          const { log } = ctx.context;
          log.set({
            routeId: "/.well-known/oauth-authorization-server",
          });
          const handlers =
            await import("@/app/.well-known/oauth-authorization-server/route");
          return dispatchRouteHandler(handlers, ctx.request, ctx.params);
        },
      },
    },
  }
);
