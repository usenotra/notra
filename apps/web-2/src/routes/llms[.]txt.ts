import { createFileRoute } from "@tanstack/react-router";

import { buildLlmsText } from "@/utils/llms";
import { textResponse } from "@/utils/markdown";

async function GET() {
  return textResponse(await buildLlmsText());
}

export const Route = createFileRoute("/llms.txt")({
  server: { handlers: { GET } },
});
