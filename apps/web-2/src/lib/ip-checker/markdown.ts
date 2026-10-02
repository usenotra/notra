import {
  CRAWLER_CATEGORY_COPY,
  IP_CHECKER_API_URL,
  IP_CHECKER_MARKDOWN_URL,
  IP_CHECKER_TITLE,
  IP_CHECKER_URL,
} from "@/constants/ip-checker";
import { formatListDate } from "@/lib/ip-checker/format";
import type {
  CrawlerListSummary,
  IpCheckMatch,
  IpCheckResult,
} from "@/types/ip-checker";
import { markdownSection } from "@/utils/markdown";

function agentLine(agent: IpCheckMatch["agents"][number]) {
  const copy = CRAWLER_CATEGORY_COPY[agent.category];
  return `- ${agent.name} (${copy.label}): ${copy.usage}`;
}

function matchLines(match: IpCheckMatch): string[] {
  const lines = [
    `**${match.vendor}** publishes this address in the range \`${match.range}\` (list updated ${formatListDate(match.listUpdatedAt)}).`,
    "",
    `Source: ${match.listUrl}`,
    "",
    match.agents.length === 1
      ? "Crawler using this range:"
      : "Crawlers sharing this range:",
    "",
    ...match.agents.map(agentLine),
  ];
  if (match.agents.length > 1) {
    lines.push(
      "",
      `${match.vendor} publishes one range list for all ${match.agents.length} crawlers, so the address alone cannot tell them apart. Use the user agent from the same log line.`
    );
  }
  return lines;
}

function coverageLines(result: IpCheckResult): string[] {
  const lines = [
    `Checked ${result.listsChecked} of ${result.listsTotal} vendor lists.`,
  ];
  if (result.listsUnavailable.length > 0) {
    lines.push(
      `Could not reach the lists for ${result.listsUnavailable.join(", ")} right now, so this check is incomplete.`
    );
  }
  return lines;
}

function resultLines(result: IpCheckResult): string[] {
  const version = result.version === "v4" ? "IPv4" : "IPv6";
  const header = [`Checked \`${result.ip}\` (${version}).`, ""];
  const coverage = ["", ...coverageLines(result)];
  if (result.easterEgg) {
    return [
      ...header,
      `**${result.easterEgg.title}.** ${result.easterEgg.body}`,
    ];
  }
  if (result.matches.length === 0) {
    const incomplete = result.listsUnavailable.length > 0;
    return [
      ...header,
      incomplete
        ? "Not in any AI crawler range we could check. It can still be a bot: some lists were unreachable, many agents fetch from ordinary cloud or residential addresses, and some spoof a crawler user agent."
        : "Not in any published AI crawler range. It can still be a bot: many agents fetch from ordinary cloud or residential addresses, and some spoof a crawler user agent.",
      ...coverage,
    ];
  }
  return [
    ...header,
    ...result.matches.flatMap((match) => matchLines(match)),
    ...coverage,
  ];
}

function listsTable(lists: readonly CrawlerListSummary[]): string[] {
  return [
    "| Vendor | Crawlers | Ranges | Updated | List |",
    "| --- | --- | --- | --- | --- |",
    ...lists.map((list) => {
      const agents = list.agents
        .map(
          (agent) =>
            `${agent.name} (${CRAWLER_CATEGORY_COPY[agent.category].label})`
        )
        .join(", ");
      const ranges = list.ok ? String(list.rangeCount) : "Unavailable";
      return `| ${list.vendor} | ${agents} | ${ranges} | ${formatListDate(list.updatedAt)} | ${list.url} |`;
    }),
  ];
}

function resultSection(
  result: IpCheckResult | null,
  invalidInput: string | null
): string[] {
  if (result) {
    return [markdownSection("Result", resultLines(result))];
  }
  if (invalidInput !== null) {
    return [
      markdownSection("Result", [
        invalidInput.length > 0
          ? `\`${invalidInput}\` is not a valid IPv4 or IPv6 address.`
          : "The ip parameter is empty. Pass an IPv4 or IPv6 address.",
      ]),
    ];
  }
  return [];
}

export function buildIpCheckerMarkdown(
  lists: readonly CrawlerListSummary[],
  result: IpCheckResult | null,
  invalidInput: string | null
): string {
  return [
    `# ${IP_CHECKER_TITLE}`,
    "",
    "Check whether an IP address belongs to an AI crawler. Every range comes straight from the list each vendor publishes, refreshed hourly.",
    "",
    ...resultSection(result, invalidInput),
    markdownSection("How to use", [
      `- Markdown: GET \`${IP_CHECKER_MARKDOWN_URL}?ip=<address>\``,
      `- JSON: GET \`${IP_CHECKER_API_URL}?ip=<address>\`, or POST \`${IP_CHECKER_API_URL}\` with body \`{"ip": "<address>"}\``,
      `- Browser: \`${IP_CHECKER_URL}?ip=<address>\``,
    ]),
    markdownSection("Lists we check", listsTable(lists)),
    markdownSection("What a match means", [
      "A hit tells you the address is owned by that vendor and used by the crawlers listed. When several crawlers share one range, pair the result with the user agent from the same request.",
      "",
      "No match is not proof of a human. Coding agents, browser extensions and many assistants fetch pages from ordinary cloud or residential addresses and never publish them.",
    ]),
  ].join("\n");
}
