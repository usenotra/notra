import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/image")({
  server: {
    handlers: {
      // Lazy like the other API routes: sharp is a native module, and loading
      // it with the router delayed every cold instance's first response.
      GET: async ({ request }) => {
        const { optimizeFrameworkImage } =
          await import("../utils/framework-image.server");
        return optimizeFrameworkImage(request);
      },
    },
  },
});
