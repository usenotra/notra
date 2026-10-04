import { createFileRoute } from "@tanstack/react-router";

import { dispatchRouteHandler } from "@/lib/auth/route-handler";

export const Route = createFileRoute("/api/uploads/content-images/$")({
  server: {
    handlers: {
      ANY: async ({ request, params }) => {
        const handlers =
          await import("@/app/api/uploads/content-images/[...key]/route");
        return dispatchRouteHandler(handlers, request, {
          ...params,
          key: params._splat?.split("/"),
        });
      },
    },
  },
});
