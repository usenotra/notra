import { createFileRoute } from "@tanstack/react-router";

import { dispatchRouteHandler } from "@/lib/auth/route-handler";
import { requestLogMiddleware } from "@/middleware/request-log";

export const Route = createFileRoute("/api/integrations/github/callback")({
  server: {
    middleware: [requestLogMiddleware],
    handlers: {
      ANY: async (ctx) => {
        const { log } = ctx.context;
        log.set({ routeId: "/api/integrations/github/callback" });
        const handlers =
          await import("@/app/api/integrations/github/callback/route");
        return dispatchRouteHandler(handlers, ctx.request, ctx.params);
      },
    },
  },
});
