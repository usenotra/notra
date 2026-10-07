import { createFileRoute } from "@tanstack/react-router";

import { dispatchRouteHandler } from "@/lib/auth/route-handler";
import { requestLogMiddleware } from "@/middleware/request-log";

export const Route = createFileRoute("/api/autumn/$")({
  server: {
    middleware: [requestLogMiddleware],
    handlers: {
      ANY: async (ctx) => {
        const { log } = ctx.context;
        log.set({ routeId: "/api/autumn/$" });
        const handlers = await import("@/app/api/autumn/[...all]/route");
        return dispatchRouteHandler(handlers, ctx.request, {
          ...ctx.params,
          all: ctx.params._splat?.split("/"),
        });
      },
    },
  },
});
