import {
  REPORT_BRAND_COLORS,
  REPORT_OTHER_BRAND_COLOR,
  STATE_OF_AI_SEARCH_PATH,
} from "@/constants/state-of-ai-search";
import type {
  StateOfAiSearchEngineId,
  StateOfAiSearchReport,
} from "@/types/state-of-ai-search";

export function reportPath(slug: string, edition: string): string {
  return `${STATE_OF_AI_SEARCH_PATH}/${slug}/${edition}`;
}

/** Bar color for a ranked brand; everyone past the top five shares slate. */
export function brandColor(rank: number): string {
  return REPORT_BRAND_COLORS[rank - 1] ?? REPORT_OTHER_BRAND_COLOR;
}

export function reportTitle(report: StateOfAiSearchReport): string {
  return `State of AI Search: ${report.subject} · ${report.editionLabel}`;
}

/** Engine names for running text: "Google's AI Overview" instead of the chip label. */
export function engineNames(report: StateOfAiSearchReport): string {
  return listFormat(
    report.engines.map((engine) =>
      engine.id === "ai-overview" ? "Google's AI Overview" : engine.label
    )
  );
}

export function reportDescription(report: StateOfAiSearchReport): string {
  const leader = report.ranking[0];
  const engines = engineNames(report);
  const lead = leader
    ? `${leader.name} leads with ${leader.visibility}% visibility.`
    : "";
  return `We asked ${engines} ${report.totals.prompts} questions about ${report.noun}s and analyzed ${report.totals.answers} answers. ${lead}`.trim();
}

const LIST_FORMAT = new Intl.ListFormat("en", {
  style: "long",
  type: "conjunction",
});

function listFormat(items: readonly string[]): string {
  return LIST_FORMAT.format(items);
}

export function formatPercent(value: number | null): string {
  return value === null ? "–" : `${value}%`;
}

export function formatReportDate(isoDate: string): string {
  return new Date(`${isoDate.slice(0, 10)}T00:00:00Z`).toLocaleDateString(
    "en-US",
    { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }
  );
}

export function formatShortDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function csvCell(value: string | number | null): string {
  if (value === null) {
    return "";
  }
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function csvRows(rows: (string | number | null)[][]): string {
  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

/** One CSV with a block per table, keyed by a leading `table` column. */
export function buildReportCsv(report: StateOfAiSearchReport): string {
  const engineIds: StateOfAiSearchEngineId[] = report.engines.map(
    (engine) => engine.id
  );
  return [
    csvRows([
      [
        "table",
        "report",
        "subject",
        "edition",
        "published_at",
        "prompts",
        "answers",
        "assistants",
      ],
      [
        "edition",
        report.slug,
        report.subject,
        report.edition,
        report.publishedAt,
        report.totals.prompts,
        report.totals.answers,
        engineIds.join("; "),
      ],
    ]),
    csvRows([
      [
        "table",
        "rank",
        "brand",
        "domain",
        "visibility",
        "top_pick",
        "own_site_cited",
        ...engineIds,
      ],
      ...report.ranking.map((row) => [
        "ranking",
        row.rank,
        row.name,
        row.domain,
        row.visibility,
        row.topPick,
        row.ownSiteCited,
        ...engineIds.map((id) => row.byEngine[id]),
      ]),
    ]),
    csvRows([
      [
        "table",
        "prompt",
        "named_first",
        "brands_mentioned",
        "engines_agree",
        "ai_overview_shown",
      ],
      ...report.prompts.map((prompt) => [
        "prompts",
        prompt.prompt,
        prompt.topPick?.name ?? null,
        prompt.brands.map((brand) => brand.name).join("; "),
        prompt.consensus ? "yes" : "no",
        prompt.aiOverviewShown ? "yes" : "no",
      ]),
    ]),
    csvRows([
      ["table", "domain", "share_of_answers_citing", ...engineIds],
      ...report.sources.map((source) => [
        "cited_sources",
        source.domain,
        source.share,
        ...engineIds.map((id) => source.byEngine[id]),
      ]),
    ]),
  ].join("\n\n");
}
