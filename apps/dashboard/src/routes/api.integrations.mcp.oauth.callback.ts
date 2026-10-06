// evlog-map-disable audit -- the handler in src/app writes the audit record
// once it knows whether the connection succeeded
import { createFileRoute } from "@tanstack/react-router";

import { dispatchRouteHandler } from "@/lib/auth/route-handler";
import { requestLogMiddleware } from "@/middleware/request-log";

export const Route = createFileRoute("/api/integrations/mcp/oauth/callback")({
  server: {
    middleware: [requestLogMiddleware],
    handlers: {
      ANY: async (ctx) => {
        const { log } = ctx.context;
        log.set({ routeId: "/api/integrations/mcp/oauth/callback" });
        const handlers =
          await import("@/app/api/integrations/mcp/oauth/callback/route");
        return dispatchRouteHandler(handlers, ctx.request, ctx.params);
      },
    },
  },
});
