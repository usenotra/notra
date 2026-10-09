import { createFileRoute } from "@tanstack/react-router";

import { dispatchRouteHandler } from "@/lib/auth/route-handler";

export const Route = createFileRoute(
  "/api/organizations/$organizationId/content/$contentId/excalidraw"
)({
  server: {
    handlers: {
      ANY: async ({ request, params }) => {
        const handlers =
          await import("@/app/api/organizations/[organizationId]/content/[contentId]/excalidraw/route");
        return dispatchRouteHandler(handlers, request, params);
      },
    },
  },
});
