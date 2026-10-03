import { createFileRoute } from "@tanstack/react-router";

import { markdownResponse } from "@/utils/http";
import { buildDeveloperLlmsText } from "@/utils/llms";

function GET() {
  return markdownResponse(buildDeveloperLlmsText());
}

export const Route = createFileRoute("/developers/llms.txt")({
  server: { handlers: { GET } },
});
