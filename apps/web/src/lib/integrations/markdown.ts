import { AUTH_SIGNUP_URL } from "@/constants/auth";
import {
  INTEGRATIONS_CONSOLE_URL,
  INTEGRATIONS_DOCS_URL,
} from "@/constants/integrations";
import {
  SLACK_CONNECT_HREF,
  SLACK_CONNECT_LABEL,
  SLACK_CTA_BADGE_LABEL,
  SLACK_CTA_CONTACT_HREF,
  SLACK_CTA_HEADING,
  SLACK_CTA_PRIMARY_LABEL,
  SLACK_CTA_SECONDARY_LABEL,
  SLACK_CTA_SUBCOPY,
  SLACK_DRAFT_BODY,
  SLACK_DRAFT_HEADLINE,
  SLACK_DRAFT_META,
  SLACK_DRAFT_TITLE,
  SLACK_FEATURES,
  SLACK_HEADLINE,
  SLACK_HERO_SUBHEAD,
  SLACK_MARKETPLACE_HREF,
  SLACK_MARKETPLACE_LABEL,
  SLACK_THREAD_CHANNEL,
  SLACK_THREAD_MESSAGES,
  SLACK_TOOLS,
} from "@/constants/slack-integration";
import { fetchIntegration, fetchIntegrations } from "@/lib/integrations/fetch";
import {
  buildAuthorCategoryLine,
  buildCardMeta,
  buildDetailStats,
  getFeaturedIntegrations,
  getIntegrationConnectUrl,
  getIntegrationHref,
  getToolDescription,
} from "@/lib/integrations/helpers";
import type {
  Integration,
  IntegrationMarkdownEntry,
  IntegrationTool,
} from "@/types/integrations";
import { getIntegrationReferralUrl } from "@/utils/integration-referral-url";
import { markdownSection } from "@/utils/markdown";
import { SITE_URL } from "@/utils/urls";

const STATIC_INTEGRATION_SLUGS = new Set(["slack"]);

function getIntegrationSlug(integration: Integration): string {
  return integration.slug ?? integration.id;
}

function getIntegrationMarkdownUrl(integration: Integration): string {
  return `${SITE_URL}${getIntegrationHref(integration)}.md`;
}

function getIntegrationDescription(integration: Integration): string {
  return (
    integration.description ??
    `Connect ${integration.name} to your Notra workspace in one click.`
  );
}

function renderIntegrationLine(integration: Integration): string {
  const meta = [
    buildAuthorCategoryLine(integration),
    buildCardMeta(integration),
  ]
    .filter(Boolean)
    .join(" · ");
  const description = integration.description
    ? `: ${integration.description}`
    : "";
  return `- [${integration.name}](${getIntegrationMarkdownUrl(integration)})${description} (${meta})`;
}

function renderToolLines(tools: IntegrationTool[]): string[] {
  return tools.map((tool) => {
    const description = getToolDescription(tool);
    return description
      ? `- \`${tool.name}\`: ${description}`
      : `- \`${tool.name}\``;
  });
}

function toAbsoluteUrl(href: string): string {
  return new URL(href, SITE_URL).href;
}

export async function buildIntegrationsMarkdown(): Promise<string> {
  const integrations = await fetchIntegrations();
  const featured = getFeaturedIntegrations(integrations);

  return [
    "# Every tool you ship with, plugged into Notra.",
    "",
    "Browse integrations built by the community and reviewed by us. Connect any of them to your workspace in one click.",
    "",
    ...(featured.length > 0
      ? [
          markdownSection(
            "Editor's picks",
            featured.map((integration) => renderIntegrationLine(integration))
          ),
        ]
      : []),
    markdownSection(
      `All integrations (${integrations.length})`,
      integrations.map((integration) => renderIntegrationLine(integration))
    ),
    markdownSection("List your integration in the marketplace.", [
      "Manage everything from the Notra Console: name, description, logo, banner and brand color. Submit for review and go live for every workspace.",
      "",
      `- [Open the Console](${INTEGRATIONS_CONSOLE_URL})`,
      `- [Read the docs](${INTEGRATIONS_DOCS_URL})`,
    ]),
  ].join("\n");
}

export async function listIntegrationMarkdownEntries(): Promise<
  IntegrationMarkdownEntry[]
> {
  const integrations = await fetchIntegrations();
  const entries: IntegrationMarkdownEntry[] = [];
  for (const integration of integrations) {
    const id = getIntegrationSlug(integration);
    if (STATIC_INTEGRATION_SLUGS.has(id)) {
      continue;
    }
    entries.push({
      id,
      title: `${integration.name} integration for Notra`,
      description: getIntegrationDescription(integration),
    });
  }
  return entries;
}

export async function buildIntegrationMarkdown(
  id: string
): Promise<string | null> {
  if (STATIC_INTEGRATION_SLUGS.has(id)) {
    return null;
  }
  const integration = await fetchIntegration(id);
  if (!integration) {
    return null;
  }

  const byline = [
    integration.author ? `by ${integration.author}` : null,
    integration.category,
    "Verified publisher",
  ]
    .filter(Boolean)
    .join(" · ");
  const links = [`- [Connect](${getIntegrationConnectUrl(integration)})`];
  if (integration.websiteUrl) {
    links.push(
      `- [Website](${getIntegrationReferralUrl(integration.websiteUrl)})`
    );
  }
  links.push(`- [All integrations](${SITE_URL}/integrations.md)`);

  return [
    `# ${integration.name}`,
    "",
    byline,
    "",
    getIntegrationDescription(integration),
    "",
    ...buildDetailStats(integration).map(
      (stat) => `- ${stat.label}: ${stat.value}`
    ),
    "",
    ...(integration.tools.length > 0
      ? [markdownSection("Tools", renderToolLines(integration.tools))]
      : []),
    markdownSection("Links", links),
  ].join("\n");
}

export function buildSlackIntegrationMarkdown(): string {
  const headline = `${SLACK_HEADLINE.pre} ${SLACK_HEADLINE.channel} ${SLACK_HEADLINE.post} ${SLACK_HEADLINE.secondLinePre} ${SLACK_HEADLINE.accent}`;
  const threadLines = SLACK_THREAD_MESSAGES.map(
    (threadMessage) => `> **${threadMessage.author}**: ${threadMessage.message}`
  );

  return [
    `# ${headline}`,
    "",
    SLACK_HERO_SUBHEAD,
    "",
    `- [${SLACK_CONNECT_LABEL}](${SLACK_CONNECT_HREF})`,
    `- [${SLACK_MARKETPLACE_LABEL}](${toAbsoluteUrl(SLACK_MARKETPLACE_HREF)}.md)`,
    "",
    markdownSection("From thread to announcement", [
      `A thread in ${SLACK_THREAD_CHANNEL}:`,
      "",
      ...threadLines.flatMap((line) => [line, ">"]).slice(0, -1),
      "",
      `Becomes an ${SLACK_DRAFT_TITLE.toLowerCase()}:`,
      "",
      `> **${SLACK_DRAFT_HEADLINE}**`,
      ">",
      `> ${SLACK_DRAFT_BODY}`,
      "",
      SLACK_DRAFT_META,
    ]),
    markdownSection(
      "Features",
      SLACK_FEATURES.flatMap((feature) => [
        `### ${feature.title}`,
        feature.description,
        "",
      ])
    ),
    markdownSection("Tools", renderToolLines(SLACK_TOOLS)),
    markdownSection(SLACK_CTA_HEADING, [
      SLACK_CTA_SUBCOPY,
      "",
      SLACK_CTA_BADGE_LABEL,
      "",
      `- [${SLACK_CTA_PRIMARY_LABEL}](${AUTH_SIGNUP_URL})`,
      `- [${SLACK_CTA_SECONDARY_LABEL}](${toAbsoluteUrl(SLACK_CTA_CONTACT_HREF)})`,
    ]),
  ].join("\n");
}
