import { createFileRoute } from "@tanstack/react-router";

import { dispatchRouteHandler } from "@/lib/auth/route-handler";

export const Route = createFileRoute("/api/uploads/convert-heic")({
  server: {
    handlers: {
      ANY: async ({ request, params }) => {
        const handlers = await import("@/app/api/uploads/convert-heic/route");
        return dispatchRouteHandler(handlers, request, params);
      },
    },
  },
});
