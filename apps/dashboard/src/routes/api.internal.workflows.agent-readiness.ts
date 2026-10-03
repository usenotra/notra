import { createFileRoute } from "@tanstack/react-router";

import { dispatchRouteHandler } from "@/lib/auth/route-handler";

export const Route = createFileRoute("/api/internal/workflows/agent-readiness")(
  {
    server: {
      handlers: {
        ANY: async ({ request, params }) => {
          const handlers =
            await import("@/app/api/internal/workflows/agent-readiness/route");
          return dispatchRouteHandler(handlers, request, params);
        },
      },
    },
  }
);
