// evlog-map-disable audit -- proxies public AuthKit metadata, no user action
import { createFileRoute } from "@tanstack/react-router";

import { dispatchRouteHandler } from "@/lib/auth/route-handler";
import { requestLogMiddleware } from "@/middleware/request-log";

export const Route = createFileRoute(
  "/.well-known/oauth-authorization-server/api/auth"
)({
  server: {
    middleware: [requestLogMiddleware],
    handlers: {
      ANY: async (ctx) => {
        const { log } = ctx.context;
        log.set({
          routeId: "/.well-known/oauth-authorization-server/api/auth",
        });
        const handlers =
          await import("@/app/.well-known/oauth-authorization-server/api/auth/route");
        return dispatchRouteHandler(handlers, ctx.request, ctx.params);
      },
    },
  },
});
