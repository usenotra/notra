import type {
  StateOfAiSearchReport,
  StateOfAiSearchSummary,
} from "@/types/state-of-ai-search";

// Built by packages/geo-core/scripts/state-of-ai-search/build.ts. Summaries
// are tiny and bundled; a full report is its own chunk, loaded per page.
const SUMMARY_MODULES = import.meta.glob<StateOfAiSearchSummary>(
  "/src/content/state-of-ai-search/*/*.summary.json",
  { eager: true, import: "default" }
);
const REPORT_LOADERS = import.meta.glob<StateOfAiSearchReport>(
  [
    "/src/content/state-of-ai-search/*/*.json",
    "!/src/content/state-of-ai-search/*/*.summary.json",
  ],
  { import: "default" }
);

const SUMMARIES: StateOfAiSearchSummary[] = Object.values(SUMMARY_MODULES);

export function listSummaries(): StateOfAiSearchSummary[] {
  return SUMMARIES;
}

export function findSummary(
  slug: string,
  edition: string
): StateOfAiSearchSummary | undefined {
  return SUMMARIES.find(
    (summary) => summary.slug === slug && summary.edition === edition
  );
}

export function latestSummary(
  slug: string
): StateOfAiSearchSummary | undefined {
  return SUMMARIES.filter((summary) => summary.slug === slug).toSorted((a, b) =>
    b.edition.localeCompare(a.edition)
  )[0];
}

/** Newest edition per category. */
export function listLatestSummaries(): StateOfAiSearchSummary[] {
  const slugs = [...new Set(SUMMARIES.map((summary) => summary.slug))];
  return slugs.flatMap((slug) => latestSummary(slug) ?? []);
}

export async function loadReport(
  slug: string,
  edition: string
): Promise<StateOfAiSearchReport | undefined> {
  const load =
    REPORT_LOADERS[`/src/content/state-of-ai-search/${slug}/${edition}.json`];
  return load ? await load() : undefined;
}
