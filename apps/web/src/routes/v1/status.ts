import { createFileRoute } from "@tanstack/react-router";

import { apiUrl, siteUrl } from "@/utils/agent-metadata";
import { jsonResponse } from "@/utils/http";

function GET() {
  return jsonResponse({
    status: "ok",
    service: "Notra API discovery",
    public: true,
    production_status: apiUrl("/v1/status"),
    openapi: apiUrl("/openapi.json"),
    authentication: {
      type: "bearer",
      resource_metadata: apiUrl("/.well-known/oauth-protected-resource"),
      guide: siteUrl("/auth.md"),
    },
  });
}

export const Route = createFileRoute("/v1/status")({
  server: { handlers: { GET } },
});
