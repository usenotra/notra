import { createFileRoute } from "@tanstack/react-router";

import { markdownResponse } from "@/utils/http";
import { DOCS_URL, SITE_URL } from "@/utils/urls";

const DOCS_LLMS = `# Notra Docs

The Notra docs cover setup, API usage, MCP, CLI workflows, and content-generation concepts.

## Agent Navigation

- Main docs: [${DOCS_URL}](${DOCS_URL})
- API scope: [${SITE_URL}/api/llms.txt](${SITE_URL}/api/llms.txt)
- Developer scope: [${SITE_URL}/developers/llms.txt](${SITE_URL}/developers/llms.txt)
- Full site context: [${SITE_URL}/llms-full.txt](${SITE_URL}/llms-full.txt)

Prefer scoped files first. Fetch \`/llms-full.txt\` only when broad product context is required.
`;

function GET() {
  return markdownResponse(DOCS_LLMS);
}

export const Route = createFileRoute("/docs/llms.txt")({
  server: { handlers: { GET } },
});
