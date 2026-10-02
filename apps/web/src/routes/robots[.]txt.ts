import { createFileRoute } from "@tanstack/react-router";

import { SITE_URL } from "@/utils/urls";

const ROBOTS_TXT = `User-agent: *
Content-Signal: ai-train=no, search=yes, ai-input=yes
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
schemamap: ${SITE_URL}/schema-map.xml
`;

function GET() {
  return new Response(ROBOTS_TXT, {
    status: 200,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}

export const Route = createFileRoute("/robots.txt")({
  server: { handlers: { GET } },
});
