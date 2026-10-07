import { createFileRoute } from "@tanstack/react-router";

import { SITE_URL } from "@/utils/urls";

const SCHEMA_MAP = `<?xml version="1.0" encoding="UTF-8"?>
<schemamap xmlns="https://schema.org/">
  <url>
    <loc>${SITE_URL}/schema/notra.jsonl</loc>
    <type>application/x-ndjson</type>
    <name>Notra structured data feed</name>
  </url>
  <url>
    <loc>${SITE_URL}/rss.xml</loc>
    <type>application/rss+xml</type>
    <name>Notra blog RSS feed</name>
  </url>
</schemamap>
`;

function GET() {
  return new Response(SCHEMA_MAP, {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}

export const Route = createFileRoute("/schema-map.xml")({
  server: { handlers: { GET } },
});
