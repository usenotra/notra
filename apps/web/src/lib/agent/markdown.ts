import { buildAgentJson, siteUrl } from "@/utils/agent-metadata";
import { markdownSection } from "@/utils/markdown";

export function buildAgentPageMarkdown() {
  const agent = buildAgentJson();

  return [
    "# Notra Agent Interface",
    "",
    "Notra helps you track and improve your visibility in AI answers. Monitor brand mentions across ChatGPT, Claude, Gemini and Perplexity, compare your share of voice with competitors and turn content gaps into articles in your brand voice.",
    "",
    markdownSection(
      "What you can do with Notra",
      agent.capabilities.map((capability) => `- ${capability}`)
    ),
    markdownSection("Discovery", [
      `- Agent JSON: ${siteUrl("/.well-known/agent.json")}`,
      `- Agent Card: ${siteUrl("/.well-known/agent-card.json")}`,
      `- API Catalog: ${siteUrl("/.well-known/api-catalog")}`,
      `- Integration Surfaces: ${siteUrl("/.well-known/integrations.json")}`,
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
