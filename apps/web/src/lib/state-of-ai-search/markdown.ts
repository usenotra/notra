import {
  STATE_OF_AI_SEARCH_DESCRIPTION,
  STATE_OF_AI_SEARCH_TITLE,
} from "@/constants/state-of-ai-search";
import type { StateOfAiSearchReport } from "@/types/state-of-ai-search";
import {
  formatPercent,
  formatReportDate,
  reportPath,
  reportTitle,
} from "@/utils/state-of-ai-search";
import { buildReportFindings } from "@/utils/state-of-ai-search-findings";
import { SITE_URL } from "@/utils/urls";

import { listLatestReports } from "./reports";

function table(header: string[], rows: string[][]): string {
  return [
    `| ${header.join(" | ")} |`,
    `| ${header.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.join(" | ")} |`),
  ].join("\n");
}

export function buildStateOfAiSearchIndexMarkdown(): string {
  const reports = listLatestReports();
  return [
    `# ${STATE_OF_AI_SEARCH_TITLE}`,
    "",
    STATE_OF_AI_SEARCH_DESCRIPTION,
    "",
    "## Reports",
    "",
    ...reports.map((report) => {
      const leaders = report.ranking
        .slice(0, 3)
        .map((row) => `${row.name} (${row.visibility}%)`)
        .join(", ");
      return `- [${report.subject}, ${report.editionLabel}](${SITE_URL}${reportPath(report.slug, report.edition)}): ${leaders}`;
    }),
    "",
  ].join("\n");
}

export function buildStateOfAiSearchReportMarkdown(
  report: StateOfAiSearchReport
): string {
  const engines = report.engines;
  const url = `${SITE_URL}${reportPath(report.slug, report.edition)}`;
  return [
    `# ${reportTitle(report)}`,
    "",
    `Published ${formatReportDate(report.publishedAt)}. ${report.totals.answers} answers from ${engines.map((engine) => engine.label).join(", ")} to ${report.totals.prompts} prompts about ${report.noun}s.`,
    "",
    "## Findings",
    "",
    ...buildReportFindings(report).map((finding) => `- ${finding}`),
    "",
    "## Visibility ranking",
    "",
    table(
      [
        "#",
        "Brand",
        "Visibility",
        "Named first",
        ...engines.map((engine) => engine.label),
        "Own site cited",
      ],
      report.ranking.map((row) => [
        String(row.rank),
        `${row.name} (${row.domain})`,
        formatPercent(row.visibility),
        formatPercent(row.topPick),
        ...engines.map((engine) => formatPercent(row.byEngine[engine.id])),
        formatPercent(row.ownSiteCited),
      ])
    ),
    "",
    "## Prompts",
    "",
    table(
      ["Prompt", "Named first", "Brands mentioned"],
      report.prompts.map((prompt) => [
        prompt.prompt,
        prompt.topPick?.name ?? "–",
        prompt.brands.map((brand) => brand.name).join(", "),
      ])
    ),
    "",
    "## Cited sources",
    "",
    table(
      ["Domain", "Cited in"],
      report.sources.map((source) => [
        source.domain,
        formatPercent(source.share),
      ])
    ),
    "",
    `Data: ${url}/data.csv`,
    "",
  ].join("\n");
}
