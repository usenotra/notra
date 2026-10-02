import { createFileRoute } from "@tanstack/react-router";

import { optimizeFrameworkImage } from "../utils/framework-image.server";

export const Route = createFileRoute("/api/image")({
  server: {
    handlers: { GET: ({ request }) => optimizeFrameworkImage(request) },
  },
});
