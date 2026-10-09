import { AUTH_SIGNUP_URL } from "@/constants/auth";
import { CTA_BANNER_PRIMARY_LABEL } from "@/constants/landing/cta-banner";
import {
  REPORT_LEADER_LOGOS,
  STATE_OF_AI_SEARCH_CTA_HEADING,
  STATE_OF_AI_SEARCH_CTA_SUBCOPY,
  STATE_OF_AI_SEARCH_DESCRIPTION,
  STATE_OF_AI_SEARCH_TITLE,
  STATE_OF_AI_SEARCH_URL,
} from "@/constants/state-of-ai-search";
import type {
  StateOfAiSearchEngineId,
  StateOfAiSearchReport,
} from "@/types/state-of-ai-search";
import { escapeMarkdownLinkText, markdownSection } from "@/utils/markdown";
import {
  engineNames,
  formatPercent,
  formatReportDate,
  reportDescription,
  reportPath,
  reportTitle,
} from "@/utils/state-of-ai-search";
import { buildReportFindings } from "@/utils/state-of-ai-search-findings";
import { SITE_URL } from "@/utils/urls";

import { listLatestSummaries } from "./reports";

/** Brands listed per prompt before the rest collapse into "+N more". */
const PROMPT_BRANDS_LISTED = 4;
/** Brands that get a "What the assistants say" entry. */
const QUOTED_BRANDS = 5;

const TABLE_PIPE_REGEX = /\|/g;
const LINE_BREAK_REGEX = /\s*\n\s*/g;

interface Column {
  header: string;
  align?: "left" | "right";
}

/** Cell text that cannot break the row: no pipes, no line breaks. */
function cell(value: string): string {
  return value.replace(LINE_BREAK_REGEX, " ").replace(TABLE_PIPE_REGEX, "\\|");
}

function table(columns: Column[], rows: string[][]): string {
  const divider = columns.map((column) =>
    column.align === "right" ? "---:" : "---"
  );
  return [
    `| ${columns.map((column) => column.header).join(" | ")} |`,
    `| ${divider.join(" | ")} |`,
    ...rows.map((row) => `| ${row.map(cell).join(" | ")} |`),
  ].join("\n");
}

function link(text: string, url: string): string {
  return `[${escapeMarkdownLinkText(text)}](${url})`;
}

function reportUrl(slug: string, edition: string): string {
  return `${SITE_URL}${reportPath(slug, edition)}`;
}

function engineLabel(
  report: StateOfAiSearchReport,
  id: StateOfAiSearchEngineId
): string {
  return report.engines.find((engine) => engine.id === id)?.label ?? id;
}

function engineColumns(report: StateOfAiSearchReport): Column[] {
  return report.engines.map((engine) => ({
    header: engine.label,
    align: "right",
  }));
}

function ctaMarkdown(): string {
  return markdownSection(STATE_OF_AI_SEARCH_CTA_HEADING, [
    STATE_OF_AI_SEARCH_CTA_SUBCOPY,
    "",
    link(CTA_BANNER_PRIMARY_LABEL, AUTH_SIGNUP_URL),
  ]);
}

export function buildStateOfAiSearchIndexMarkdown(): string {
  const reports = listLatestSummaries();
  return [
    `# ${STATE_OF_AI_SEARCH_TITLE}`,
    "",
    STATE_OF_AI_SEARCH_DESCRIPTION,
    "",
    markdownSection("Reports", [
      table(
        [
          { header: "Category" },
          { header: "Edition" },
          { header: "Leader" },
          { header: "Visibility", align: "right" },
          { header: "Runners-up" },
        ],
        reports.map((report) => {
          const [leader, ...rest] = report.leaders;
          return [
            link(report.subject, reportUrl(report.slug, report.edition)),
            report.editionLabel,
            leader?.name ?? "–",
            formatPercent(leader?.visibility ?? null),
            rest
              .slice(0, REPORT_LEADER_LOGOS - 1)
              .map((row) => `${row.name} (${row.visibility}%)`)
              .join(", "),
          ];
        })
      ),
      "",
      "Every report has a CSV with all of its tables: append `/data.csv` to the report URL.",
    ]),
    ctaMarkdown(),
  ].join("\n");
}

function rankingMarkdown(report: StateOfAiSearchReport): string {
  return markdownSection("Visibility ranking", [
    "Visibility is the share of answers that name the brand. Named first is the share that name it before any other tracked brand, own site cited the share that link to the brand's own domain. All three are averaged across the assistants, so each assistant counts the same however many answers it gave.",
    "",
    table(
      [
        { header: "#", align: "right" },
        { header: "Brand" },
        { header: "Visibility", align: "right" },
        { header: "Named first", align: "right" },
        ...engineColumns(report),
        { header: "Own site cited", align: "right" },
      ],
      report.ranking.map((row) => [
        String(row.rank),
        link(row.name, `https://${row.domain}`),
        `**${formatPercent(row.visibility)}**`,
        formatPercent(row.topPick),
        ...report.engines.map((engine) =>
          formatPercent(row.byEngine[engine.id])
        ),
        formatPercent(row.ownSiteCited),
      ])
    ),
  ]);
}

function assistantsMarkdown(report: StateOfAiSearchReport): string {
  return markdownSection("By assistant", [
    table(
      [
        { header: "Assistant" },
        { header: "Model" },
        { header: "Answers", align: "right" },
        { header: "Brands per answer", align: "right" },
        { header: "Sources per answer", align: "right" },
      ],
      report.engines.map((engine) => [
        engine.label,
        `\`${engine.model}\``,
        String(engine.answers),
        String(engine.brandsPerAnswer),
        String(engine.sourcesPerAnswer),
      ])
    ),
  ]);
}

function promptsMarkdown(report: StateOfAiSearchReport): string {
  return markdownSection("Prompts", [
    `The ${report.totals.prompts} questions we asked, with the brand named first most often and the others that came up.`,
    "",
    table(
      [
        { header: "#", align: "right" },
        { header: "Prompt" },
        { header: "Named first" },
        { header: "Also named" },
      ],
      report.prompts.map((prompt, index) => {
        const others = prompt.brands
          .map((brand) => brand.name)
          .filter((name) => name !== prompt.topPick?.name);
        const hidden = others.length - PROMPT_BRANDS_LISTED;
        const listed = others.slice(0, PROMPT_BRANDS_LISTED).join(", ");
        return [
          String(index + 1),
          prompt.prompt,
          prompt.topPick ? `**${prompt.topPick.name}**` : "–",
          hidden > 0 ? `${listed}, +${hidden} more` : listed || "–",
        ];
      })
    ),
  ]);
}

function quotesMarkdown(report: StateOfAiSearchReport): string | null {
  const entries = report.ranking.slice(0, QUOTED_BRANDS).flatMap((row) => {
    const quotes = report.quotes[row.name] ?? [];
    if (quotes.length === 0) {
      return [];
    }
    return [
      `### ${row.name}`,
      ...quotes.flatMap((quote) => [
        "",
        `> ${quote.text.replace(LINE_BREAK_REGEX, " ")}`,
        ">",
        `> ${engineLabel(report, quote.engine)}, asked "${quote.prompt}"`,
      ]),
      "",
    ];
  });
  if (entries.length === 0) {
    return null;
  }
  // The section adds its own blank line after the last quote.
  return markdownSection("What the assistants say", entries.slice(0, -1));
}

function sourcesMarkdown(report: StateOfAiSearchReport): string {
  return markdownSection("Cited sources", [
    "The domains the assistants link to most, by share of answers that cite them at least once, averaged across the assistants.",
    "",
    table(
      [
        { header: "#", align: "right" },
        { header: "Domain" },
        { header: "Cited in", align: "right" },
        ...engineColumns(report),
        { header: "Top page" },
      ],
      report.sources.map((source, index) => {
        const [page] = source.pages;
        return [
          String(index + 1),
          link(source.domain, `https://${source.domain}`),
          `**${formatPercent(source.share)}**`,
          ...report.engines.map((engine) =>
            formatPercent(source.byEngine[engine.id])
          ),
          page ? link(page.title ?? page.url, page.url) : "–",
        ];
      })
    ),
  ]);
}

function moreReportsMarkdown(report: StateOfAiSearchReport): string | null {
  const others = listLatestSummaries().filter(
    (summary) => summary.slug !== report.slug
  );
  if (others.length === 0) {
    return null;
  }
  return markdownSection("More reports", [
    ...others.map((summary) => {
      const leader = summary.leaders[0];
      const lead = leader
        ? `: ${leader.name} leads with ${leader.visibility}%`
        : "";
      return `- ${link(summary.subject, reportUrl(summary.slug, summary.edition))}${lead}`;
    }),
    "",
    `All reports: ${STATE_OF_AI_SEARCH_URL}`,
  ]);
}

export function buildStateOfAiSearchReportMarkdown(
  report: StateOfAiSearchReport
): string {
  const url = reportUrl(report.slug, report.edition);
  const sections = [
    markdownSection(
      "Key findings",
      buildReportFindings(report).map((finding) => `- ${finding}`)
    ),
    rankingMarkdown(report),
    assistantsMarkdown(report),
    promptsMarkdown(report),
    quotesMarkdown(report),
    sourcesMarkdown(report),
    moreReportsMarkdown(report),
    ctaMarkdown(),
  ];
  return [
    `# ${reportTitle(report)}`,
    "",
    `> ${reportDescription(report)}`,
    "",
    `- **Published:** ${formatReportDate(report.publishedAt)}`,
    `- **Assistants:** ${engineNames(report)}`,
    `- **Coverage:** ${report.totals.prompts} prompts, ${report.totals.answers} answers, ${report.totals.brands} tracked brands, ${report.totals.citedDomains} cited domains`,
    `- **Data:** ${link("data.csv", `${url}/data.csv`)}`,
    "",
    ...sections.filter((section) => section !== null),
  ].join("\n");
}
