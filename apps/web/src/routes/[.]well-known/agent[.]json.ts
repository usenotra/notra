import { createFileRoute } from "@tanstack/react-router";

import { buildAgentJson } from "@/utils/agent-metadata";
import { jsonResponse } from "@/utils/http";

function GET() {
  return jsonResponse(buildAgentJson());
}

export const Route = createFileRoute("/.well-known/agent.json")({
  server: { handlers: { GET } },
});
