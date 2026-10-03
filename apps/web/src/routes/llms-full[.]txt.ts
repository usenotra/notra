import { createFileRoute } from "@tanstack/react-router";

import { buildLlmsFullText } from "@/utils/llms";
import { textResponse } from "@/utils/markdown";

async function GET() {
  return textResponse(await buildLlmsFullText());
}

export const Route = createFileRoute("/llms-full.txt")({
  server: { handlers: { GET } },
});
