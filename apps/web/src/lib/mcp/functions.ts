import { createServerFn } from "@tanstack/react-start";

import { MCP_FALLBACK_TOOL_CARDS } from "@/constants/mcp";
import { fetchMcpTools } from "@/lib/mcp/tools";

export const getMcpTools = createServerFn({ method: "GET" }).handler(
  async () => (await fetchMcpTools()) ?? MCP_FALLBACK_TOOL_CARDS
);
