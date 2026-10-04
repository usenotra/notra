import { createFileRoute } from "@tanstack/react-router";

import { dispatchRouteHandler } from "@/lib/auth/route-handler";

export const Route = createFileRoute("/rpc/$")({
  server: {
    handlers: {
      ANY: async ({ request, params }) => {
        const handlers = await import("@/app/rpc/[[...rest]]/route");
        return dispatchRouteHandler(handlers, request, {
          ...params,
          rest: params._splat?.split("/"),
        });
      },
    },
  },
});
