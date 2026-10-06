import { AUTH_SIGNUP_URL } from "@/constants/auth";
import {
  GITHUB_CONNECT_HREF,
  GITHUB_CONNECT_LABEL,
  GITHUB_CTA_BADGE_LABEL,
  GITHUB_CTA_CONTACT_HREF,
  GITHUB_CTA_HEADING,
  GITHUB_CTA_PRIMARY_LABEL,
  GITHUB_CTA_SECONDARY_LABEL,
  GITHUB_CTA_SUBCOPY,
  GITHUB_DRAFT_BODY,
  GITHUB_DRAFT_HEADLINE,
  GITHUB_DRAFT_META,
  GITHUB_DRAFT_TITLE,
  GITHUB_FEATURES,
  GITHUB_HEADLINE,
  GITHUB_HERO_SUBHEAD,
  GITHUB_MARKETPLACE_HREF,
  GITHUB_MARKETPLACE_LABEL,
  GITHUB_PULL_REQUEST,
  GITHUB_REPOSITORY,
  GITHUB_TOOLS,
} from "@/constants/github-integration";
import {
  GRANOLA_CONNECT_HREF,
  GRANOLA_CONNECT_LABEL,
  GRANOLA_CTA_BADGE_LABEL,
  GRANOLA_CTA_CONTACT_HREF,
  GRANOLA_CTA_HEADING,
  GRANOLA_CTA_PRIMARY_LABEL,
  GRANOLA_CTA_SECONDARY_LABEL,
  GRANOLA_CTA_SUBCOPY,
  GRANOLA_DRAFT_BODY,
  GRANOLA_DRAFT_HEADLINE,
  GRANOLA_DRAFT_META,
  GRANOLA_DRAFT_TITLE,
  GRANOLA_FEATURES,
  GRANOLA_HEADLINE,
  GRANOLA_HERO_SUBHEAD,
  GRANOLA_MARKETPLACE_HREF,
  GRANOLA_MARKETPLACE_LABEL,
  GRANOLA_NOTE_HEADING,
  GRANOLA_NOTE_LINES,
  GRANOLA_NOTE_TITLE,
  GRANOLA_TOOLS,
} from "@/constants/granola-integration";
import {
  INTEGRATIONS_CONSOLE_URL,
  INTEGRATIONS_DOCS_URL,
  STATIC_INTEGRATION_PAGE_SLUGS,
} from "@/constants/integrations";
import {
  LINEAR_CONNECT_HREF,
  LINEAR_CONNECT_LABEL,
  LINEAR_CTA_BADGE_LABEL,
  LINEAR_CTA_CONTACT_HREF,
  LINEAR_CTA_HEADING,
  LINEAR_CTA_PRIMARY_LABEL,
  LINEAR_CTA_SECONDARY_LABEL,
  LINEAR_CTA_SUBCOPY,
  LINEAR_CYCLE_NAME,
  LINEAR_DRAFT_BODY,
  LINEAR_DRAFT_HEADLINE,
  LINEAR_DRAFT_META,
  LINEAR_DRAFT_TITLE,
  LINEAR_FEATURES,
  LINEAR_HEADLINE,
  LINEAR_HERO_SUBHEAD,
  LINEAR_ISSUES,
  LINEAR_MARKETPLACE_HREF,
  LINEAR_MARKETPLACE_LABEL,
  LINEAR_TOOLS,
} from "@/constants/linear-integration";
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
import { escapeMarkdownLinkText, markdownSection } from "@/utils/markdown";
import { SITE_URL } from "@/utils/urls";

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
  return `- [${escapeMarkdownLinkText(integration.name)}](${getIntegrationMarkdownUrl(integration)})${description} (${meta})`;
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
    if (STATIC_INTEGRATION_PAGE_SLUGS.has(id)) {
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
  if (STATIC_INTEGRATION_PAGE_SLUGS.has(id)) {
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
  const headline = `${SLACK_HEADLINE.pre} ${SLACK_HEADLINE.mention} ${SLACK_HEADLINE.secondLinePre} ${SLACK_HEADLINE.accent}`;
  const threadLines = SLACK_THREAD_MESSAGES.map((threadMessage) => {
    const message = threadMessage.mention
      ? `${threadMessage.mention} ${threadMessage.message}`
      : threadMessage.message;
    return `> **${threadMessage.author}**: ${message}`;
  });

  return [
    `# ${headline}`,
    "",
    SLACK_HERO_SUBHEAD,
    "",
    `- [${SLACK_CONNECT_LABEL}](${SLACK_CONNECT_HREF})`,
    `- [${SLACK_MARKETPLACE_LABEL}](${toAbsoluteUrl(SLACK_MARKETPLACE_HREF)}.md)`,
    "",
    markdownSection("From thread to draft", [
      `A thread in ${SLACK_THREAD_CHANNEL}:`,
      "",
      ...threadLines.flatMap((line) => [line, ">"]).slice(0, -1),
      "",
      `Notra replies with a ${SLACK_DRAFT_TITLE.toLowerCase()}:`,
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

export function buildGithubIntegrationMarkdown(): string {
  const headline = `${GITHUB_HEADLINE.pre} ${GITHUB_HEADLINE.highlight} ${GITHUB_HEADLINE.secondLinePre} ${GITHUB_HEADLINE.accent}`;
  const sourceLines = [
    `- ${GITHUB_PULL_REQUEST.number} ${GITHUB_PULL_REQUEST.title} (merged by ${GITHUB_PULL_REQUEST.author} into ${GITHUB_PULL_REQUEST.baseBranch})`,
    "",
    `> ${GITHUB_PULL_REQUEST.comment}`,
  ];

  return [
    `# ${headline}`,
    "",
    GITHUB_HERO_SUBHEAD,
    "",
    `- [${GITHUB_CONNECT_LABEL}](${GITHUB_CONNECT_HREF})`,
    `- [${GITHUB_MARKETPLACE_LABEL}](${toAbsoluteUrl(GITHUB_MARKETPLACE_HREF)}.md)`,
    "",
    markdownSection("From pull requests to changelog", [
      `Merged in ${GITHUB_REPOSITORY}:`,
      "",
      ...sourceLines,
      "",
      `Notra writes this ${GITHUB_DRAFT_TITLE.toLowerCase()}:`,
      "",
      `> **${GITHUB_DRAFT_HEADLINE}**`,
      ">",
      `> ${GITHUB_DRAFT_BODY}`,
      "",
      GITHUB_DRAFT_META,
    ]),
    markdownSection(
      "Features",
      GITHUB_FEATURES.flatMap((feature) => [
        `### ${feature.title}`,
        feature.description,
        "",
      ])
    ),
    markdownSection("Tools", renderToolLines(GITHUB_TOOLS)),
    markdownSection(GITHUB_CTA_HEADING, [
      GITHUB_CTA_SUBCOPY,
      "",
      GITHUB_CTA_BADGE_LABEL,
      "",
      `- [${GITHUB_CTA_PRIMARY_LABEL}](${AUTH_SIGNUP_URL})`,
      `- [${GITHUB_CTA_SECONDARY_LABEL}](${toAbsoluteUrl(GITHUB_CTA_CONTACT_HREF)})`,
    ]),
  ].join("\n");
}

export function buildLinearIntegrationMarkdown(): string {
  const headline = `${LINEAR_HEADLINE.pre} ${LINEAR_HEADLINE.highlight} ${LINEAR_HEADLINE.secondLinePre} ${LINEAR_HEADLINE.accent}`;
  const sourceLines = LINEAR_ISSUES.map(
    (issue) => `- ${issue.identifier} ${issue.title} (${issue.label})`
  );

  return [
    `# ${headline}`,
    "",
    LINEAR_HERO_SUBHEAD,
    "",
    `- [${LINEAR_CONNECT_LABEL}](${LINEAR_CONNECT_HREF})`,
    `- [${LINEAR_MARKETPLACE_LABEL}](${toAbsoluteUrl(LINEAR_MARKETPLACE_HREF)}.md)`,
    "",
    markdownSection("From issues to release notes", [
      `Finished in ${LINEAR_CYCLE_NAME}:`,
      "",
      ...sourceLines,
      "",
      `Notra writes this ${LINEAR_DRAFT_TITLE.toLowerCase()}:`,
      "",
      `> **${LINEAR_DRAFT_HEADLINE}**`,
      ">",
      `> ${LINEAR_DRAFT_BODY}`,
      "",
      LINEAR_DRAFT_META,
    ]),
    markdownSection(
      "Features",
      LINEAR_FEATURES.flatMap((feature) => [
        `### ${feature.title}`,
        feature.description,
        "",
      ])
    ),
    markdownSection("Tools", renderToolLines(LINEAR_TOOLS)),
    markdownSection(LINEAR_CTA_HEADING, [
      LINEAR_CTA_SUBCOPY,
      "",
      LINEAR_CTA_BADGE_LABEL,
      "",
      `- [${LINEAR_CTA_PRIMARY_LABEL}](${AUTH_SIGNUP_URL})`,
      `- [${LINEAR_CTA_SECONDARY_LABEL}](${toAbsoluteUrl(LINEAR_CTA_CONTACT_HREF)})`,
    ]),
  ].join("\n");
}

export function buildGranolaIntegrationMarkdown(): string {
  const headline = `${GRANOLA_HEADLINE.pre} ${GRANOLA_HEADLINE.highlight} ${GRANOLA_HEADLINE.secondLinePre} ${GRANOLA_HEADLINE.accent}`;
  const sourceLines = [
    `### ${GRANOLA_NOTE_HEADING}`,
    ...GRANOLA_NOTE_LINES.map(
      (line) => `${line.nested ? "  " : ""}- ${line.text}`
    ),
  ];

  return [
    `# ${headline}`,
    "",
    GRANOLA_HERO_SUBHEAD,
    "",
    `- [${GRANOLA_CONNECT_LABEL}](${GRANOLA_CONNECT_HREF})`,
    `- [${GRANOLA_MARKETPLACE_LABEL}](${toAbsoluteUrl(GRANOLA_MARKETPLACE_HREF)}.md)`,
    "",
    markdownSection("From meeting notes to customer story", [
      `Granola note "${GRANOLA_NOTE_TITLE}":`,
      "",
      ...sourceLines,
      "",
      `Notra writes this ${GRANOLA_DRAFT_TITLE.toLowerCase()}:`,
      "",
      `> **${GRANOLA_DRAFT_HEADLINE}**`,
      ">",
      `> ${GRANOLA_DRAFT_BODY}`,
      "",
      GRANOLA_DRAFT_META,
    ]),
    markdownSection(
      "Features",
      GRANOLA_FEATURES.flatMap((feature) => [
        `### ${feature.title}`,
        feature.description,
        "",
      ])
    ),
    markdownSection("Tools", renderToolLines(GRANOLA_TOOLS)),
    markdownSection(GRANOLA_CTA_HEADING, [
      GRANOLA_CTA_SUBCOPY,
      "",
      GRANOLA_CTA_BADGE_LABEL,
      "",
      `- [${GRANOLA_CTA_PRIMARY_LABEL}](${AUTH_SIGNUP_URL})`,
      `- [${GRANOLA_CTA_SECONDARY_LABEL}](${toAbsoluteUrl(GRANOLA_CTA_CONTACT_HREF)})`,
    ]),
  ].join("\n");
}
