import { createFileRoute } from "@tanstack/react-router";

import { buildAgentJson } from "@/utils/agent-metadata";
import { SITE_DESCRIPTION, SITE_TITLE } from "@/utils/metadata";
import { SITE_URL } from "@/utils/urls";

function GET() {
  const agent = buildAgentJson();
  const rows = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Notra",
      url: SITE_URL,
      sameAs: agent.sameAs,
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: SITE_TITLE,
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
    },
  ];

  return new Response(rows.map((row) => JSON.stringify(row)).join("\n"), {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}

export const Route = createFileRoute("/schema/notra.jsonl")({
  server: { handlers: { GET } },
});
