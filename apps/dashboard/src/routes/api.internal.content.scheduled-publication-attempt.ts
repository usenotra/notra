import { createFileRoute } from "@tanstack/react-router";

import { dispatchRouteHandler } from "@/lib/auth/route-handler";
import { requestLogMiddleware } from "@/middleware/request-log";

export const Route = createFileRoute(
  "/api/internal/content/scheduled-publication-attempt"
)({
  server: {
    middleware: [requestLogMiddleware],
    handlers: {
      ANY: async (ctx) => {
        const { log } = ctx.context;
        log.set({
          routeId: "/api/internal/content/scheduled-publication-attempt",
        });
        const handlers =
          await import("@/app/api/internal/content/scheduled-publication-attempt/route");
        return dispatchRouteHandler(handlers, ctx.request, ctx.params);
      },
    },
  },
});
