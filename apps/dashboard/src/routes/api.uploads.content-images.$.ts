import { createFileRoute } from "@tanstack/react-router";

import { dispatchRouteHandler } from "@/lib/auth/route-handler";
import { requestLogMiddleware } from "@/middleware/request-log";

export const Route = createFileRoute("/api/uploads/content-images/$")({
  server: {
    middleware: [requestLogMiddleware],
    handlers: {
      ANY: async (ctx) => {
        const { log } = ctx.context;
        log.set({ routeId: "/api/uploads/content-images/$" });
        const handlers =
          await import("@/app/api/uploads/content-images/[...key]/route");
        return dispatchRouteHandler(handlers, ctx.request, {
          ...ctx.params,
          key: ctx.params._splat?.split("/"),
        });
      },
    },
  },
});
