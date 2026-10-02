import { createFileRoute } from "@tanstack/react-router";

import {
  DOCS_URL,
  MCP_PROTECTED_RESOURCE_METADATA_URL,
  MCP_URL,
} from "@/utils/urls";

const AUTHENTICATION_DESCRIPTION = [
  "OAuth 2.1 bearer access token.",
  `Discover protected resource metadata at ${MCP_PROTECTED_RESOURCE_METADATA_URL}.`,
  "Dashboard API keys are also supported for MCP clients that use manual bearer credentials.",
].join(" ");

function GET() {
  const body = {
    serverInfo: {
      name: "notra",
      version: "1.0.4",
    },
    transport: {
      type: "streamable-http",
      endpoint: MCP_URL,
    },
    capabilities: ["tools"],
    authentication: {
      type: "bearer",
      description: AUTHENTICATION_DESCRIPTION,
    },
    documentation: `${DOCS_URL}/devtools/mcp`,
  };

  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "cache-control": "public, max-age=3600",
    },
  });
}

export const Route = createFileRoute("/.well-known/mcp/server-card.json")({
  server: { handlers: { GET } },
});
