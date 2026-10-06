import { createFileRoute } from "@tanstack/react-router";

import { dispatchRouteHandler } from "@/lib/auth/route-handler";
import { requestLogMiddleware } from "@/middleware/request-log";

export const Route = createFileRoute("/api/brand-font/file")({
  server: {
    middleware: [requestLogMiddleware],
    handlers: {
      ANY: async (ctx) => {
        const { log } = ctx.context;
        log.set({ routeId: "/api/brand-font/file" });
        const handlers = await import("@/app/api/brand-font/file/route");
        return dispatchRouteHandler(handlers, ctx.request, ctx.params);
      },
    },
  },
});
