import { createFileRoute } from "@tanstack/react-router";

import { serveMarkdownTwin } from "@/lib/markdown/handler";

export const Route = createFileRoute("/md/$")({
  server: {
    handlers: {
      GET: ({ request, params }) =>
        serveMarkdownTwin(request, params._splat?.split("/") ?? []),
    },
  },
});
