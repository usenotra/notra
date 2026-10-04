import { createFileRoute } from "@tanstack/react-router";

import { dispatchRouteHandler } from "@/lib/auth/route-handler";

export const Route = createFileRoute("/api/autumn/$")({
  server: {
    handlers: {
      ANY: async ({ request, params }) => {
        const handlers = await import("@/app/api/autumn/[...all]/route");
        return dispatchRouteHandler(handlers, request, {
          ...params,
          all: params._splat?.split("/"),
        });
      },
    },
  },
});
