import { createFileRoute } from "@tanstack/react-router";

import { apiUrl, siteUrl } from "@/utils/agent-metadata";
import { jsonResponse } from "@/utils/http";
import { DOCS_URL } from "@/utils/urls";

function GET() {
  return jsonResponse(
    {
      linkset: [
        {
          anchor: siteUrl(),
          item: [
            {
              href: apiUrl("/openapi.json"),
              rel: "service-desc",
              type: "application/openapi+json",
              title: "Notra Public API OpenAPI schema",
            },
            {
              href: DOCS_URL,
              rel: "service-doc",
              type: "text/html",
              title: "Notra developer documentation",
            },
            {
              href: siteUrl("/auth.md"),
              rel: "authorization-server-metadata",
              type: "text/markdown",
              title: "Notra agent authentication guide",
            },
            {
              href: siteUrl("/feedback.md"),
              rel: "feedback",
              type: "text/markdown",
              title: "Notra agent feedback guide",
            },
          ],
        },
      ],
    },
    {
      contentType:
        'application/linkset+json; profile="https://www.rfc-editor.org/info/rfc9727"; charset=utf-8',
    }
  );
}

export const Route = createFileRoute("/.well-known/api-catalog")({
  server: { handlers: { GET } },
});
