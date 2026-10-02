import { createFileRoute } from "@tanstack/react-router";

import { buildSitemapEntries } from "@/lib/sitemap/entries";
import { renderSitemapXml } from "@/lib/sitemap/xml";

async function GET() {
  const entries = await buildSitemapEntries();
  return new Response(renderSitemapXml(entries), {
    headers: {
      "content-type": "application/xml",
      "cache-control": "public, max-age=0, must-revalidate",
    },
  });
}

export const Route = createFileRoute("/sitemap.xml")({
  server: { handlers: { GET } },
});
