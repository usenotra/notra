import {
  MCP_CLIENTS,
  MCP_FALLBACK_TOOL_CARDS,
  MCP_TERMINAL_RESULT_MESSAGE,
  MCP_TERMINAL_TOOL_CALLS,
  MCP_TERMINAL_USER_MESSAGE,
} from "@/constants/mcp";
import {
  MCP_USE_CASE_CATEGORIES,
  MCP_USE_CASE_TOOL_LABELS,
  MCP_USE_CASES,
  MCP_USE_CASES_BUILD_YOUR_OWN_URL,
  MCP_USE_CASES_PATH,
  MCP_USE_CASES_PRIMARY_CTA,
  MCP_USE_CASES_SECONDARY_CTA,
  MCP_USE_CASES_SHARE_HREF,
  MCP_USE_CASES_SUBHEAD,
} from "@/constants/mcp-use-cases";
import { fetchMcpTools } from "@/lib/mcp/tools";
import type {
  McpUseCase,
  McpUseCaseMarkdownEntry,
} from "@/types/mcp-use-cases";
import { markdownSection } from "@/utils/markdown";
import {
  formatMcpHeroSubhead,
  formatMcpUseCasesCalloutLabel,
} from "@/utils/mcp";
import {
  findMcpUseCase,
  getMcpUseCaseCategory,
  getMcpUseCaseHref,
  getRelatedMcpUseCases,
} from "@/utils/mcp-use-cases";
import { MCP_URL, SITE_URL } from "@/utils/urls";

const MCP_PAGE_MARKDOWN_URL = `${SITE_URL}/mcp.md`;
const MCP_USE_CASES_MARKDOWN_URL = `${SITE_URL}${MCP_USE_CASES_PATH}.md`;

function useCaseMarkdownUrl(entry: McpUseCase) {
  return `${SITE_URL}${getMcpUseCaseHref(entry)}.md`;
}

function formatAuthorLine(entry: McpUseCase) {
  if (!entry.author) {
    return null;
  }
  if (!entry.author.url) {
    return `By ${entry.author.name}`;
  }
  return `By [${entry.author.name}](${entry.author.url})`;
}

function useCaseListItem(entry: McpUseCase) {
  return `- [${entry.title}](${useCaseMarkdownUrl(entry)}): ${entry.tagline}`;
}

export async function buildMcpMarkdown(): Promise<string> {
  const tools = (await fetchMcpTools()) ?? MCP_FALLBACK_TOOL_CARDS;
  const clients = MCP_CLIENTS.flatMap((client) => [
    `### ${client.label}`,
    "",
    "```bash",
    client.command,
    "```",
    "",
  ]);
  const toolLines = tools.map((tool) =>
    tool.description
      ? `- \`${tool.name}\`: ${tool.description}`
      : `- \`${tool.name}\``
  );
  const exampleCalls = MCP_TERMINAL_TOOL_CALLS.map(
    (call) => `- ${call.tool} (${call.arg}): ${call.result}`
  );

  return [
    "# Notra, for your agent",
    "",
    formatMcpHeroSubhead(tools.length),
    "",
    `MCP server URL: ${MCP_URL}`,
    "",
    markdownSection("Connect from any client", clients),
    markdownSection("Example session", [
      `Prompt: "${MCP_TERMINAL_USER_MESSAGE}"`,
      "",
      ...exampleCalls,
      "",
      MCP_TERMINAL_RESULT_MESSAGE,
    ]),
    markdownSection("What your agent can do", toolLines),
    markdownSection("Not sure what to ask your agent?", [
      formatMcpUseCasesCalloutLabel(MCP_USE_CASES.length),
      "",
      `[Browse use cases](${MCP_USE_CASES_MARKDOWN_URL})`,
    ]),
  ].join("\n");
}

export function buildMcpUseCasesMarkdown(): string {
  const categorySections = MCP_USE_CASE_CATEGORIES.flatMap((category) => {
    const entries = MCP_USE_CASES.filter(
      (entry) => entry.category === category.id
    );
    if (entries.length === 0) {
      return [];
    }
    return [markdownSection(category.label, entries.map(useCaseListItem))];
  });

  return [
    "# Real workflows built with Notra MCP",
    "",
    MCP_USE_CASES_SUBHEAD,
    "",
    `[${MCP_USE_CASES_PRIMARY_CTA}](${MCP_PAGE_MARKDOWN_URL})`,
    "",
    `[${MCP_USE_CASES_SECONDARY_CTA}](${new URL(MCP_USE_CASES_SHARE_HREF, SITE_URL).href})`,
    "",
    ...categorySections,
  ].join("\n");
}

export function listMcpUseCaseMarkdownEntries(): McpUseCaseMarkdownEntry[] {
  return MCP_USE_CASES.map((entry) => ({
    slug: entry.slug,
    title: entry.title,
    description: entry.tagline,
  }));
}

export function buildMcpUseCaseMarkdown(slug: string): string | null {
  const entry = findMcpUseCase(slug);
  if (!entry) {
    return null;
  }

  const category = getMcpUseCaseCategory(entry.category);
  const integrations = entry.stack
    .filter((toolId) => toolId !== "notra")
    .map((toolId) => MCP_USE_CASE_TOOL_LABELS[toolId]);
  const runsOn =
    integrations.length > 0
      ? `Runs on Notra MCP with ${integrations.join(" + ")}.`
      : "Runs on Notra MCP.";
  const author = formatAuthorLine(entry);
  const related = getRelatedMcpUseCases(entry);

  return [
    `# ${entry.title}`,
    "",
    `Category: ${category.label}`,
    "",
    ...(author ? [author, ""] : []),
    entry.tagline,
    "",
    `[Connect Notra MCP](${MCP_PAGE_MARKDOWN_URL})`,
    "",
    `[Build your own workflow](${MCP_USE_CASES_BUILD_YOUR_OWN_URL})`,
    "",
    markdownSection("Prompt", [
      "```",
      entry.prompt,
      "```",
      "",
      runsOn,
      "",
      `Notra MCP tools used: ${entry.tools.map((tool) => `\`${tool}\``).join(", ")}`,
    ]),
    markdownSection(
      "What this use case can do for you",
      entry.body.flatMap((paragraph) => [paragraph, ""])
    ),
    ...(related.length > 0
      ? [
          markdownSection("Related use cases", [
            ...related.map(useCaseListItem),
            "",
            `[View all](${MCP_USE_CASES_MARKDOWN_URL})`,
          ]),
        ]
      : []),
  ].join("\n");
}
