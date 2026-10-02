import { AUTH_SIGNUP_URL } from "@/constants/auth";
import {
  ACTIVITY_HEADING,
  ACTIVITY_SUBCOPY,
  CONTRIBUTORS_HEADING,
  CONTRIBUTORS_HERO_SUBTITLE,
  CONTRIBUTORS_HERO_TITLE,
  CONTRIBUTORS_SUBCOPY,
  ISSUES_CARD_DESCRIPTION,
  ISSUES_CARD_TITLE,
  NOTRA_AI_CALLOUT_BODY,
  NOTRA_AI_CALLOUT_BODY_SUFFIX,
  NOTRA_AI_CALLOUT_CTA,
  NOTRA_AI_CALLOUT_TITLE,
  PRS_CARD_DESCRIPTION,
  PRS_CARD_TITLE,
  SPONSORS_CAPTION,
} from "@/constants/contributors";
import { SPONSORS } from "@/lib/sponsors/constants";
import {
  GITHUB_REPO_URL,
  fetchContributorsData,
  formatContributionCount,
  formatGitHubDate,
  formatNotraAiPrCountLabel,
  formatViewAllLabel,
  getIssueTypeFromLabels,
} from "@/utils/github";
import { escapeMarkdownLinkText, markdownSection } from "@/utils/markdown";
import { DOCS_URL } from "@/utils/urls";

export async function buildContributorsMarkdown(): Promise<string> {
  const data = await fetchContributorsData();

  const contributorLines =
    data.contributors.length > 0
      ? data.contributors.map((contributor) => {
          const count = formatContributionCount(contributor.contributions);
          const plural = contributor.contributions === 1 ? "" : "s";
          return `- [${contributor.login}](${contributor.html_url}): ${count} contribution${plural}`;
        })
      : ["Unable to load contributors right now. Try again later."];

  const notraAiLines =
    data.notraAiPrCount > 0
      ? [
          "",
          `### ${NOTRA_AI_CALLOUT_TITLE}`,
          `${NOTRA_AI_CALLOUT_BODY} ${formatNotraAiPrCountLabel(data.notraAiPrCount)} ${NOTRA_AI_CALLOUT_BODY_SUFFIX}`,
          "",
          `[${NOTRA_AI_CALLOUT_CTA}](${DOCS_URL}/integrations/github)`,
        ]
      : [];

  const issueLines =
    data.issues.length > 0
      ? data.issues.map(
          (issue) =>
            `- [#${issue.number} ${escapeMarkdownLinkText(issue.title)}](${issue.html_url}) (${getIssueTypeFromLabels(issue.labels).type}, by ${issue.user.login}, ${formatGitHubDate(issue.created_at)})`
        )
      : ["No open issues at the moment"];

  const prLines =
    data.prs.length > 0
      ? data.prs.map(
          (pr) =>
            `- [#${pr.number} ${escapeMarkdownLinkText(pr.title)}](${pr.html_url}) (${pr.draft ? "Draft" : "Ready"}, by ${pr.user.login}, ${formatGitHubDate(pr.created_at)})`
        )
      : ["No open pull requests at the moment"];

  return [
    `# ${CONTRIBUTORS_HERO_TITLE}`,
    "",
    CONTRIBUTORS_HERO_SUBTITLE,
    "",
    `- [Try Notra for free](${AUTH_SIGNUP_URL})`,
    `- [View on GitHub](${GITHUB_REPO_URL})`,
    "",
    markdownSection(CONTRIBUTORS_HEADING, [
      CONTRIBUTORS_SUBCOPY,
      "",
      ...contributorLines,
      ...notraAiLines,
    ]),
    SPONSORS.length > 0
      ? markdownSection("Sponsors", [
          SPONSORS_CAPTION,
          "",
          ...SPONSORS.map((sponsor) => `- [${sponsor.name}](${sponsor.url})`),
        ])
      : "",
    markdownSection(ACTIVITY_HEADING, [
      ACTIVITY_SUBCOPY,
      "",
      `### ${ISSUES_CARD_TITLE}`,
      ISSUES_CARD_DESCRIPTION,
      "",
      ...issueLines,
      "",
      `[${formatViewAllLabel(data.stats.totalIssues)}](${GITHUB_REPO_URL}/issues)`,
      "",
      `### ${PRS_CARD_TITLE}`,
      PRS_CARD_DESCRIPTION,
      "",
      ...prLines,
      "",
      `[${formatViewAllLabel(data.stats.totalPullRequests)}](${GITHUB_REPO_URL}/pulls)`,
    ]),
  ].join("\n");
}
