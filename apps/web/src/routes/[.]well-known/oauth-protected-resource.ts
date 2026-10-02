import { createFileRoute } from "@tanstack/react-router";

import { buildProtectedResourceMetadata } from "@/utils/agent-metadata";
import { jsonResponse } from "@/utils/http";

function GET() {
  return jsonResponse(buildProtectedResourceMetadata());
}

export const Route = createFileRoute("/.well-known/oauth-protected-resource")({
  server: { handlers: { GET } },
});
