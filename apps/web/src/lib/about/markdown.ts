import { markdownSection } from "@/utils/markdown";
import { SITE_URL } from "@/utils/urls";

export function buildAboutMarkdown() {
  return [
    "# About Notra",
    "",
    "The AI content platform that turns shipped work into changelogs, launch posts, and marketing assets in your team's own voice.",
    "",
    "Notra is an AI content-generation platform for product and engineering teams. It turns shipped work into changelogs, launch posts, blog drafts, marketing assets, and social updates that match a team's own voice. The product is built for teams that already ship quickly but lose time collecting context, asking engineers what changed, and rewriting rough notes into publishable updates.",
    "",
    "Notra connects to the systems where product work happens, including GitHub today and additional workflow tools over time. It uses those signals to assemble a timeline of changes, draft content from the facts, and preserve brand voice through reusable references and writing skills. Teams can review every draft before publishing.",
    "",
    markdownSection("Built for agents, too", [
      "Agents can discover Notra through llms.txt, agent.json, the public OpenAPI schema, and MCP documentation.",
      "",
      `- [llms.txt](${SITE_URL}/llms.txt)`,
      `- [agent.json](${SITE_URL}/.well-known/agent.json)`,
      `- [Agent interface](${SITE_URL}/agent.md)`,
    ]),
  ].join("\n");
}
