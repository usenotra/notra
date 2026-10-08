/**
 * Aggregates the cached raw answers from `collect.ts` into one JSON report per
 * category under apps/web/src/content/state-of-ai-search. Free to rerun.
 *
 *   bun run packages/geo-core/scripts/state-of-ai-search/build.ts
 */
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import type {
  StateOfAiSearchBrand,
  StateOfAiSearchEngine,
  StateOfAiSearchEngineId,
  StateOfAiSearchOverview,
  StateOfAiSearchOverviewBlock,
  StateOfAiSearchPromptAnswer,
  StateOfAiSearchPromptRow,
  StateOfAiSearchQuote,
  StateOfAiSearchRankingRow,
  StateOfAiSearchReport,
  StateOfAiSearchSource,
  StateOfAiSearchSummary,
} from "../../../../apps/web/src/types/state-of-ai-search";
import {
  REPORT_CATEGORIES,
  type ReportBrand,
  type ReportCategory,
} from "./categories";
import {
  ENGINE_MODELS,
  RAW_ROOT,
  REPORT_EDITION,
  type RawAnswer,
} from "./shared";

const OUTPUT_ROOT = join(
  import.meta.dir,
  "../../../../apps/web/src/content/state-of-ai-search"
);

const ENGINE_ORDER: StateOfAiSearchEngineId[] = [
  "chatgpt",
  "claude",
  "ai-overview",
];
const ENGINE_LABELS: Record<StateOfAiSearchEngineId, string> = {
  chatgpt: "ChatGPT",
  claude: "Claude",
  "ai-overview": "AI Overview",
};

const MAX_SOURCES = 10;
const MAX_SOURCE_PAGES = 8;
const MAX_QUOTES = 3;
const MAX_QUOTES_PER_ENGINE = 1;
const MAX_PROMPT_SOURCES = 12;
const HIGHLIGHT_MAX_LENGTH = 320;
const MAX_RESPONSE_LENGTH = 6000;
const SUMMARY_LEADERS = 3;
const QUOTE_MIN_LENGTH = 50;
const QUOTE_MAX_LENGTH = 260;
/** "Profound, a competitor, calls it…" quotes someone about another brand. */
const SECONDHAND_CLAIM = /\b(a|another) competitor\b|\bcalls it\b/i;
/** The leader has to be the subject, not a side note late in the sentence. */
const QUOTE_SUBJECT_MAX_INDEX = 40;
const RECOMMENDATION_WORDS =
  /\b(best|top pick|recommend|default|go-to|my pick|strongest|winner|first choice|start with|leading)\b/i;

const MARKDOWN_CITATION = /\(\[[^\]]*\]\([^)]*\)\)/g;
const MARKDOWN_LINK = /\[([^\]]*)\]\([^)]*\)/g;
const BARE_URL = /https?:\/\/\S+/g;

function cleanAnswer(text: string): string {
  return text
    .replace(MARKDOWN_CITATION, "")
    .replace(MARKDOWN_LINK, "$1")
    .replace(BARE_URL, "");
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function brandMatchers(brand: ReportBrand): RegExp[] {
  const flags = brand.caseSensitive ? "gu" : "giu";
  return [brand.name, ...(brand.aliases ?? [])].map(
    (name) =>
      new RegExp(
        `(?<![\\p{L}\\p{N}])${escapeRegex(name)}(?![\\p{L}\\p{N}])`,
        flags
      )
  );
}

/** Index of the brand's first mention, or -1. */
function firstMention(text: string, matchers: RegExp[]): number {
  let first = -1;
  for (const matcher of matchers) {
    matcher.lastIndex = 0;
    const match = matcher.exec(text);
    if (match && (first === -1 || match.index < first)) {
      first = match.index;
    }
  }
  return first;
}

function percent(part: number, whole: number): number {
  return whole === 0 ? 0 : Math.round((part / whole) * 100);
}

function normalizeDomain(domain: string): string {
  return domain.toLowerCase().replace(/^www\./, "");
}

function ownsDomain(sourceDomain: string, brandDomain: string): boolean {
  const source = normalizeDomain(sourceDomain);
  const own = normalizeDomain(brandDomain);
  return source === own || source.endsWith(`.${own}`);
}

async function loadAnswers(category: string): Promise<RawAnswer[]> {
  const answers: RawAnswer[] = [];
  for (const engine of ENGINE_ORDER) {
    const dir = join(RAW_ROOT, REPORT_EDITION, category, engine);
    let files: string[] = [];
    try {
      files = await readdir(dir);
    } catch {
      continue;
    }
    for (const file of files.filter((name) => name.endsWith(".json")).sort()) {
      answers.push(
        JSON.parse(await readFile(join(dir, file), "utf8")) as RawAnswer
      );
    }
  }
  return answers;
}

interface AnalyzedAnswer {
  raw: RawAnswer;
  clean: string;
  /** Tracked brands in order of first mention. */
  mentioned: ReportBrand[];
}

function analyze(answer: RawAnswer, category: ReportCategory): AnalyzedAnswer {
  const clean = cleanAnswer(answer.text);
  const hits = category.brands.flatMap((brand) => {
    const index = firstMention(clean, brandMatchers(brand));
    return index === -1 ? [] : [{ brand, index }];
  });
  hits.sort((a, b) => a.index - b.index);
  return { raw: answer, clean, mentioned: hits.map((hit) => hit.brand) };
}

function toBrand(brand: ReportBrand): StateOfAiSearchBrand {
  return { name: brand.name, domain: brand.domain };
}

function emptyByEngine(): Record<StateOfAiSearchEngineId, number | null> {
  return { chatgpt: null, claude: null, "ai-overview": null };
}

function mostCommon<T>(values: T[], key: (value: T) => string): T | null {
  const counts = new Map<string, { value: T; count: number }>();
  for (const value of values) {
    const entry = counts.get(key(value)) ?? { value, count: 0 };
    entry.count += 1;
    counts.set(key(value), entry);
  }
  let best: { value: T; count: number } | null = null;
  for (const entry of counts.values()) {
    if (!best || entry.count > best.count) {
      best = entry;
    }
  }
  return best?.value ?? null;
}

function buildRanking(
  category: ReportCategory,
  byEngine: Map<StateOfAiSearchEngineId, AnalyzedAnswer[]>,
  answered: AnalyzedAnswer[]
): StateOfAiSearchRankingRow[] {
  const engines = ENGINE_ORDER.filter(
    (engine) => (byEngine.get(engine)?.length ?? 0) > 0
  );
  const rows = category.brands.map((brand) => {
    const rates = emptyByEngine();
    for (const engine of engines) {
      const list = byEngine.get(engine) ?? [];
      rates[engine] = percent(
        list.filter((answer) => answer.mentioned.includes(brand)).length,
        list.length
      );
    }
    const engineRates = engines.map((engine) => rates[engine] ?? 0);
    const visibility = Math.round(
      engineRates.reduce((sum, rate) => sum + rate, 0) /
        Math.max(1, engineRates.length)
    );
    return {
      ...toBrand(brand),
      rank: 0,
      visibility,
      topPick: percent(
        answered.filter((answer) => answer.mentioned[0] === brand).length,
        answered.length
      ),
      ownSiteCited: percent(
        answered.filter((answer) =>
          answer.raw.sources.some((source) =>
            ownsDomain(source.domain, brand.domain)
          )
        ).length,
        answered.length
      ),
      byEngine: rates,
      delta: null,
    };
  });
  rows.sort((a, b) => b.visibility - a.visibility || b.topPick - a.topPick);
  return rows.map((row, index) => ({ ...row, rank: index + 1 }));
}

function buildPrompts(
  category: ReportCategory,
  answered: AnalyzedAnswer[],
  overviewShown: Set<number>
): StateOfAiSearchPromptRow[] {
  return category.prompts.map((prompt, promptIndex) => {
    const answers = answered.filter(
      (answer) => answer.raw.promptIndex === promptIndex
    );
    const counts = new Map<ReportBrand, number>();
    for (const answer of answers) {
      for (const brand of answer.mentioned) {
        counts.set(brand, (counts.get(brand) ?? 0) + 1);
      }
    }
    const brands = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([brand]) => toBrand(brand));
    const firsts = answers.flatMap((answer) => answer.mentioned.slice(0, 1));
    const topPick = mostCommon(firsts, (brand) => brand.name);
    const engineFirsts = ENGINE_ORDER.flatMap((engine) => {
      const engineAnswers = answers.filter(
        (answer) => answer.raw.engine === engine
      );
      if (engineAnswers.length === 0) {
        return [];
      }
      const first = mostCommon(
        engineAnswers.flatMap((answer) => answer.mentioned.slice(0, 1)),
        (brand) => brand.name
      );
      return [first?.name ?? ""];
    });
    const mentionCounts = Object.fromEntries(
      [...counts.entries()].map(([brand, count]) => [brand.name, count])
    );
    const firstCounts: Record<string, number> = {};
    for (const brand of firsts) {
      firstCounts[brand.name] = (firstCounts[brand.name] ?? 0) + 1;
    }
    const responses: StateOfAiSearchPromptAnswer[] = ENGINE_ORDER.flatMap(
      (engine) => {
        const answer = answers
          .filter((item) => item.raw.engine === engine)
          .toSorted((a, b) => a.raw.sample - b.raw.sample)[0];
        if (!answer) {
          return [];
        }
        return [
          {
            engine,
            text:
              engine === "ai-overview"
                ? ""
                : answer.raw.text
                    .replace(MARKDOWN_CITATION, "")
                    .slice(0, MAX_RESPONSE_LENGTH)
                    .trim(),
            overview:
              engine === "ai-overview" ? buildOverview(answer.raw) : null,
            mentioned: answer.mentioned.map((brand) => brand.name),
            sources: answer.raw.sources
              .slice(0, MAX_PROMPT_SOURCES)
              .map((source) => ({
                url: source.url,
                title: source.title,
                domain: normalizeDomain(source.domain),
              })),
            searchQueries: answer.raw.searchQueries ?? [],
            highlights: buildHighlights(answer),
            collectedAt: answer.raw.collectedAt,
          },
        ];
      }
    );
    return {
      id: promptIndex,
      prompt,
      topPick: topPick ? toBrand(topPick) : null,
      brands,
      answers: answers.length,
      consensus:
        engineFirsts.length > 1 &&
        engineFirsts[0] !== "" &&
        engineFirsts.every((name) => name === engineFirsts[0]),
      aiOverviewShown: overviewShown.has(promptIndex),
      mentions: mentionCounts,
      firsts: firstCounts,
      responses,
    };
  });
}

function buildSources(
  byEngine: Map<StateOfAiSearchEngineId, AnalyzedAnswer[]>,
  answered: AnalyzedAnswer[]
): { sources: StateOfAiSearchSource[]; citedDomains: number } {
  const domainsOf = (answer: AnalyzedAnswer) =>
    new Set(answer.raw.sources.map((source) => normalizeDomain(source.domain)));
  const counts = new Map<string, number>();
  for (const answer of answered) {
    for (const domain of domainsOf(answer)) {
      counts.set(domain, (counts.get(domain) ?? 0) + 1);
    }
  }
  const top = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_SOURCES);
  const sources = top.map(([domain, count]) => {
    const rates = emptyByEngine();
    for (const engine of ENGINE_ORDER) {
      const list = byEngine.get(engine) ?? [];
      if (list.length > 0) {
        rates[engine] = percent(
          list.filter((answer) => domainsOf(answer).has(domain)).length,
          list.length
        );
      }
    }
    const citing = answered.filter((answer) => domainsOf(answer).has(domain));
    const pages = new Map<
      string,
      { url: string; title: string | null; citations: number }
    >();
    const prompts = new Map<
      number,
      { id: number; citations: number; engines: Set<StateOfAiSearchEngineId> }
    >();
    for (const answer of citing) {
      const seen = new Set<string>();
      for (const source of answer.raw.sources) {
        if (normalizeDomain(source.domain) !== domain) {
          continue;
        }
        const url = source.url.replace(/[?&]utm_source=openai$/, "");
        if (seen.has(url)) {
          continue;
        }
        seen.add(url);
        const page = pages.get(url) ?? {
          url,
          title: source.title,
          citations: 0,
        };
        page.citations += 1;
        pages.set(url, page);
      }
      const entry = prompts.get(answer.raw.promptIndex) ?? {
        id: answer.raw.promptIndex,
        citations: 0,
        engines: new Set<StateOfAiSearchEngineId>(),
      };
      entry.citations += 1;
      entry.engines.add(answer.raw.engine);
      prompts.set(answer.raw.promptIndex, entry);
    }
    return {
      domain,
      share: percent(count, answered.length),
      byEngine: rates,
      citations: count,
      pages: [...pages.values()]
        .toSorted((a, b) => b.citations - a.citations)
        .slice(0, MAX_SOURCE_PAGES),
      prompts: [...prompts.values()]
        .toSorted((a, b) => b.citations - a.citations)
        .map((entry) => ({
          id: entry.id,
          citations: entry.citations,
          engines: ENGINE_ORDER.filter((engine) => entry.engines.has(engine)),
        })),
    };
  });
  return { sources, citedDomains: counts.size };
}

function readRefs(value: unknown): number[] {
  return Array.isArray(value)
    ? value.filter((ref) => typeof ref === "number")
    : [];
}

function readText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function buildOverview(
  answer: RawAnswer | undefined
): StateOfAiSearchOverview | null {
  if (
    !answer?.present ||
    !answer.overview ||
    !Array.isArray(answer.overview.text_blocks)
  ) {
    return null;
  }
  const blocks: StateOfAiSearchOverviewBlock[] = [];
  for (const block of answer.overview.text_blocks as Record<
    string,
    unknown
  >[]) {
    const text = readText(block.snippet);
    if (block.type === "heading" && text) {
      blocks.push({ type: "heading", text });
    } else if (block.type === "list" && Array.isArray(block.list)) {
      const items = (block.list as Record<string, unknown>[]).flatMap(
        (item) => {
          const title = readText(item.title);
          const snippet = readText(item.snippet);
          const itemText =
            title && snippet ? `${title}: ${snippet}` : title || snippet;
          return itemText
            ? [{ text: itemText, refs: readRefs(item.reference_indexes) }]
            : [];
        }
      );
      if (items.length > 0) {
        blocks.push({ type: "list", items });
      }
    } else if (text) {
      blocks.push({
        type: "paragraph",
        text,
        refs: readRefs(block.reference_indexes),
      });
    }
  }
  const references = Array.isArray(answer.overview.references)
    ? (answer.overview.references as Record<string, unknown>[]).flatMap(
        (reference) => {
          const url = readText(reference.link);
          const index =
            typeof reference.index === "number" ? reference.index : -1;
          return url && index >= 0
            ? [
                {
                  index,
                  title: readText(reference.title),
                  url,
                  source: readText(reference.source),
                },
              ]
            : [];
        }
      )
    : [];
  return blocks.length > 0
    ? { query: answer.prompt, blocks, references }
    : null;
}

function sentencesOf(text: string): string[] {
  return text
    .split("\n")
    .filter(
      (line) => !line.trim().startsWith("|") && !line.trim().startsWith("#")
    )
    .map((line) =>
      line
        .replace(/^\s*(?:[-*+]|\d+\.)\s+/, "")
        .replace(/\*\*|__|`/g, "")
        .trim()
    )
    .flatMap((line) => line.split(/(?<=[.!?])\s+(?=[A-Z])/))
    .map((sentence) =>
      sentence
        .replace(/\s+/g, " ")
        .replace(/\s+([.,;:])/g, "$1")
        .trim()
    );
}

/** The first sentence that names each tracked brand, in answer order. */
function buildHighlights(answer: AnalyzedAnswer) {
  const text =
    answer.raw.engine === "ai-overview" && answer.raw.overview
      ? (buildOverview(answer.raw)?.blocks ?? [])
          .flatMap((block) =>
            block.type === "list"
              ? block.items.map((item) => item.text)
              : [block.text]
          )
          .join("\n")
      : answer.clean;
  const sentences = sentencesOf(text).filter(
    (sentence) => sentence.length <= HIGHLIGHT_MAX_LENGTH
  );
  return answer.mentioned.flatMap((brand) => {
    const matchers = brandMatchers(brand);
    const sentence = sentences.find(
      (item) => firstMention(item, matchers) !== -1
    );
    if (!sentence) {
      return [];
    }
    const match = matchers
      .map((matcher) => {
        matcher.lastIndex = 0;
        return matcher.exec(sentence);
      })
      .filter((found): found is RegExpExecArray => found !== null)
      .toSorted((a, b) => a.index - b.index)[0];
    return [
      { brand: brand.name, text: sentence, match: match?.[0] ?? brand.name },
    ];
  });
}

function buildQuotes(
  brand: ReportBrand,
  answered: AnalyzedAnswer[]
): StateOfAiSearchQuote[] {
  const matchers = brandMatchers(brand);
  const candidates = answered.flatMap((answer) =>
    sentencesOf(answer.clean).flatMap((sentence) => {
      const index = firstMention(sentence, matchers);
      if (
        index === -1 ||
        index > QUOTE_SUBJECT_MAX_INDEX ||
        sentence.length < QUOTE_MIN_LENGTH ||
        sentence.length > QUOTE_MAX_LENGTH ||
        sentence.endsWith(":") ||
        SECONDHAND_CLAIM.test(sentence)
      ) {
        return [];
      }
      const score =
        (RECOMMENDATION_WORDS.test(sentence) ? 2 : 0) + (index < 3 ? 1 : 0);
      return [{ answer, sentence, score }];
    })
  );
  candidates.sort((a, b) => b.score - a.score);
  const quotes: StateOfAiSearchQuote[] = [];
  const usedPrompts = new Set<number>();
  const perEngine = new Map<StateOfAiSearchEngineId, number>();
  for (const candidate of candidates) {
    const { raw } = candidate.answer;
    const engineCount = perEngine.get(raw.engine) ?? 0;
    if (
      usedPrompts.has(raw.promptIndex) ||
      engineCount >= MAX_QUOTES_PER_ENGINE
    ) {
      continue;
    }
    usedPrompts.add(raw.promptIndex);
    perEngine.set(raw.engine, engineCount + 1);
    quotes.push({
      engine: raw.engine,
      prompt: raw.prompt,
      text: candidate.sentence,
      collectedAt: raw.collectedAt,
    });
    if (quotes.length >= MAX_QUOTES) {
      break;
    }
  }
  return quotes;
}

function editionLabel(edition: string): string {
  const [year, month] = edition.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

async function buildReport(
  category: ReportCategory
): Promise<StateOfAiSearchReport | null> {
  const raw = await loadAnswers(category.slug);
  if (raw.length === 0) {
    return null;
  }
  const answered = raw
    .filter((answer) => answer.present)
    .map((answer) => analyze(answer, category));
  const byEngine = new Map<StateOfAiSearchEngineId, AnalyzedAnswer[]>();
  for (const engine of ENGINE_ORDER) {
    byEngine.set(
      engine,
      answered.filter((answer) => answer.raw.engine === engine)
    );
  }
  const overviewAnswers = raw.filter(
    (answer) => answer.engine === "ai-overview"
  );
  const overviewShown = new Set(
    overviewAnswers
      .filter((answer) => answer.present)
      .map((answer) => answer.promptIndex)
  );

  const engines: StateOfAiSearchEngine[] = ENGINE_ORDER.flatMap((engine) => {
    const list = byEngine.get(engine) ?? [];
    if (list.length === 0) {
      return [];
    }
    const average = (count: (answer: AnalyzedAnswer) => number) =>
      Math.round(
        (list.reduce((sum, answer) => sum + count(answer), 0) / list.length) *
          10
      ) / 10;
    return [
      {
        id: engine,
        label: ENGINE_LABELS[engine],
        model: ENGINE_MODELS[engine],
        answers: list.length,
        brandsPerAnswer: average((answer) => answer.mentioned.length),
        sourcesPerAnswer: average((answer) => answer.raw.sources.length),
      },
    ];
  });

  const ranking = buildRanking(category, byEngine, answered);
  const prompts = buildPrompts(category, answered, overviewShown);
  const { sources, citedDomains } = buildSources(byEngine, answered);
  const headIndex = category.prompts.indexOf(category.headQuery);
  const overview = buildOverview(
    overviewAnswers.find(
      (answer) => answer.promptIndex === headIndex && answer.present
    ) ?? overviewAnswers.find((answer) => answer.present)
  );
  const collectedDates = raw.map((answer) => answer.collectedAt).sort();

  return {
    slug: category.slug,
    edition: REPORT_EDITION,
    editionLabel: editionLabel(REPORT_EDITION),
    publishedAt: (collectedDates.at(-1) ?? new Date().toISOString()).slice(
      0,
      10
    ),
    subject: category.subject,
    noun: category.noun,
    engines,
    totals: {
      prompts: category.prompts.length,
      answers: answered.length,
      brands: category.brands.length,
      citedDomains,
      consensus: percent(
        prompts.filter((prompt) => prompt.consensus).length,
        prompts.length
      ),
      aiOverviewShown: percent(
        overviewShown.size,
        Math.max(1, overviewAnswers.length)
      ),
    },
    ranking,
    prompts: [...prompts].sort((a, b) => b.brands.length - a.brands.length),
    sources,
    overview,
    quotes: Object.fromEntries(
      category.brands.flatMap((brand) => {
        const quotes = buildQuotes(brand, answered);
        return quotes.length > 0 ? [[brand.name, quotes]] : [];
      })
    ),
  };
}

for (const category of REPORT_CATEGORIES) {
  const report = await buildReport(category);
  if (!report) {
    console.warn(`No answers for ${category.slug}, skipped`);
    continue;
  }
  const dir = join(OUTPUT_ROOT, category.slug);
  await mkdir(dir, { recursive: true });
  // Minified: the report is a lazy chunk on the site, not a file to diff by hand.
  await writeFile(
    join(dir, `${REPORT_EDITION}.json`),
    `${JSON.stringify(report)}\n`
  );
  const summary: StateOfAiSearchSummary = {
    slug: report.slug,
    edition: report.edition,
    editionLabel: report.editionLabel,
    publishedAt: report.publishedAt,
    subject: report.subject,
    noun: report.noun,
    engines: report.engines,
    leaders: report.ranking.slice(0, SUMMARY_LEADERS),
  };
  await writeFile(
    join(dir, `${REPORT_EDITION}.summary.json`),
    `${JSON.stringify(summary, null, 2)}\n`
  );
  const top = report.ranking
    .slice(0, 3)
    .map((row) => `${row.name} ${row.visibility}%`)
    .join(", ");
  console.log(`${category.slug}: ${report.totals.answers} answers · ${top}`);
}
