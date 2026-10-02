import { createFileRoute } from "@tanstack/react-router";

import { apiUrl, siteUrl } from "@/utils/agent-metadata";
import { jsonResponse } from "@/utils/http";

function GET() {
  return jsonResponse({
    name: "Notra API",
    description:
      "Public API discovery endpoint. Use the production API host for versioned operations.",
    status: siteUrl("/api/status"),
    production: apiUrl(),
    openapi: apiUrl("/openapi.json"),
    catalog: siteUrl("/.well-known/api-catalog"),
    auth: siteUrl("/auth.md"),
  });
}

export const Route = createFileRoute("/api/")({
  server: { handlers: { GET } },
});
