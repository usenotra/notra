import type { StateOfAiSearchReport } from "@/types/state-of-ai-search";

// Built by packages/geo-core/scripts/state-of-ai-search/build.ts.
const REPORT_MODULES = import.meta.glob<StateOfAiSearchReport>(
  "/src/content/state-of-ai-search/*/*.json",
  { eager: true, import: "default" }
);

const REPORTS: StateOfAiSearchReport[] = Object.values(REPORT_MODULES);

export function findReport(
  slug: string,
  edition: string
): StateOfAiSearchReport | undefined {
  return REPORTS.find(
    (report) => report.slug === slug && report.edition === edition
  );
}

export function latestReport(slug: string): StateOfAiSearchReport | undefined {
  return REPORTS.filter((report) => report.slug === slug).toSorted((a, b) =>
    b.edition.localeCompare(a.edition)
  )[0];
}

/** Newest edition per category, in the order the reports were built. */
export function listLatestReports(): StateOfAiSearchReport[] {
  const slugs = [...new Set(REPORTS.map((report) => report.slug))];
  return slugs.flatMap((slug) => latestReport(slug) ?? []);
}

export function listReports(): StateOfAiSearchReport[] {
  return REPORTS;
}
