import { buildAgentJson, siteUrl } from "@/utils/agent-metadata";
import { markdownSection } from "@/utils/markdown";

export function buildAgentPageMarkdown() {
  const agent = buildAgentJson();

  return [
    "# Notra agent interface",
    "",
    "Notra is a GEO tool that tracks how ChatGPT, Claude, Gemini and Perplexity answer the questions your buyers ask. Agents can read and manage projects, prompts, scans and posts through the API and the MCP server listed below.",
    "",
    markdownSection(
      "What you can do with Notra",
      agent.capabilities.map((capability) => `- ${capability}`)
    ),
    markdownSection("Discovery", [
      `- Agent JSON: ${siteUrl("/.well-known/agent.json")}`,
      `- Agent card: ${siteUrl("/.well-known/agent-card.json")}`,
      `- API catalog: ${siteUrl("/.well-known/api-catalog")}`,
      `- Integrations manifest: ${siteUrl("/.well-known/integrations.json")}`,
      `- Auth guide: ${agent.api.auth}`,
    ]),
    markdownSection("Endpoints", [
      `- API base URL: ${agent.api.base_url}`,
      `- OpenAPI (GET): ${agent.api.openapi}`,
      `- MCP (streamable HTTP): ${agent.mcp.streamable_http}`,
      `- API status (GET): ${agent.api.status}`,
      `- Product discovery (POST): ${siteUrl("/ask")}`,
    ]),
    markdownSection("Agent discovery JSON", [
      "```json",
      JSON.stringify(agent, null, 2),
      "```",
    ]),
  ].join("\n");
}
