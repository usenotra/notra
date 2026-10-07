import { createFileRoute } from "@tanstack/react-router";

import { dispatchRouteHandler } from "@/lib/auth/route-handler";
import { requestLogMiddleware } from "@/middleware/request-log";

export const Route = createFileRoute("/api/internal/workflows/agent-readiness")(
  {
    server: {
      middleware: [requestLogMiddleware],
      handlers: {
        ANY: async (ctx) => {
          const { log } = ctx.context;
          log.set({
            routeId: "/api/internal/workflows/agent-readiness",
          });
          const handlers =
            await import("@/app/api/internal/workflows/agent-readiness/route");
          return dispatchRouteHandler(handlers, ctx.request, ctx.params);
        },
      },
    },
  }
);
