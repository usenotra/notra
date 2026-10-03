import { createFileRoute } from "@tanstack/react-router";

import { jsonResponse } from "@/utils/http";
import { buildIntegrationsManifest } from "@/utils/integrations-manifest";

function GET() {
  return jsonResponse(buildIntegrationsManifest(), {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "cache-control": "public, max-age=3600",
    },
  });
}

export const Route = createFileRoute("/.well-known/integrations.json")({
  server: { handlers: { GET } },
});
