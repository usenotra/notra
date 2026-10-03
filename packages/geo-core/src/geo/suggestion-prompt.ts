import type { GscQueryRow } from "@notra/ai/types/google-search-console";

import {
  GEO_GAP_TITLE_MAX_LENGTH,
  GEO_PROMPT_MAX_LENGTH,
  GEO_PROMPT_MIN_LENGTH,
  GEO_TRACKED_PROMPT_VOICE,
} from "../constants/geo";
import {
  GSC_MAX_KEYWORDS_PER_SUGGESTION,
  GSC_SUGGESTIONS_MAX_PER_SYNC,
  GSC_SYNC_LOOKBACK_DAYS,
} from "../constants/google-search-console";
import type { GscSuggestionGenerationParams } from "../types/google-search-console";

function demandBand(position: number): string {
  if (position <= 3) {
    return "already winning";
  }
  if (position <= 20) {
    return "visible, not winning";
  }
  return "rarely shown";
}

function formatKeywordLine(row: GscQueryRow): string {
  const ctr =
    row.impressions > 0
      ? `${Math.round((row.clicks / row.impressions) * 100)}%`
      : "0%";
  return `- "${row.query}" (${demandBand(row.position)}, impressions ${row.impressions}, ctr ${ctr}, avg position ${row.position.toFixed(1)})`;
}

function formatList(values: string[]): string {
  if (values.length === 0) {
    return "- (none)";
  }
  return values.map((value) => `- ${value}`).join("\n");
}

function formatCompanyDescription(description: string | null): string {
  if (!description) {
    return "(not provided - infer the category from the tracked prompts below)";
  }
  return description.trim();
}

export function buildGscSuggestionPrompt(
  params: GscSuggestionGenerationParams
): string {
  const brand = params.companyName ?? "this company";
  const keywordLines = params.keywords.map(formatKeywordLine).join("\n");
  const year = new Date().getFullYear();

  return `Company: ${brand}
What ${brand} sells: ${formatCompanyDescription(params.companyDescription)}
Search Console property: ${params.siteUrl}

Tracked competitors of ${brand}:
${formatList(params.competitors)}

Google Search queries from the last ${GSC_SYNC_LOOKBACK_DAYS} days, strongest content opportunity first. ${brand} already appears for these, and most are queries it does not win. They are evidence of demand, not text to copy:
${keywordLines}

Prompts already tracked (do not repeat or paraphrase these):
${formatList(params.existingPrompts)}

Your job: find the buyer questions hidden in these queries that ${brand} could plausibly be the recommended answer to and that are not tracked yet. Write at most ${GSC_SUGGESTIONS_MAX_PER_SYNC} entries. Fewer, sharper entries beat a full list: if the queries only support four distinct intents, write four. Each entry has a "prompt", a "title", and "keywords".

Selection rules (apply before writing anything):
- Skip navigational queries: someone looking for a specific product's own pages, such as its changelog, release notes, docs, pricing, login, or status page. An assistant answers those by pointing at that product's website, so ${brand} can never win them, even when the site ranks well for them.
- Skip queries about a third-party product unless that product is a tracked competitor listed above. Never turn "<product> changelog", "<product> release notes", or "<product> updates" into a prompt.
- Skip queries outside the category ${brand} sells in.
- Keep queries that express a need ${brand} could fulfil: which tools to use for a task, how to do something in the category, what to compare, or which alternatives exist.
- Skip queries marked "already winning" unless they hide an intent that is not tracked yet. When you must cut, keep entries higher in the list.

Grouping rules:
- One entry is one distinct buyer intent. Merge queries that share an intent into a single entry.
- Each source query belongs to at most one entry. If two entries would rest on the same queries, they are duplicates: keep one.

Prompt rules:
- A prompt is the exact text a real buyer would type into ChatGPT while researching this category, before they know ${brand} exists. ${GEO_TRACKED_PROMPT_VOICE}
- Do not echo the query. Rewrite the demand as that person's situation. "email marketing software" can become "our promo emails land in spam and the tool we have feels like too much, what are small teams using".
- Spread the set. Most entries are recommendation or problem-first prompts, and a few compare tracked competitors. When the queries support it, include one that asks whether a dedicated tool is even needed. Do not make every entry "best X tools".
- Never mention "${brand}", its domain, or any brand name owned by ${brand}. Never describe what ${brand} is or does.
- Name a competitor only in an alternative or comparison prompt, and only if it is a tracked competitor or its name appears verbatim in a source query attributed to that entry. Never infer or invent a competitor.
- Write in the same language as the underlying queries and never mix languages. Each prompt must be between ${GEO_PROMPT_MIN_LENGTH} and ${GEO_PROMPT_MAX_LENGTH} characters.

Title rules:
- The title is the headline of the article that would win this prompt: specific, publishable and in Title Case, following proven formats such as "Best {Category} Tools in ${year}: {Facets} Compared", "Best {Competitor} Alternatives for {Use Case}", "{A} vs {B}: Features, Pricing & Which to Choose", "How to {Task} (Step-by-Step)", or "What Is {Term}? Definition, Examples & How to Measure It".
- Use "${year}" only in ranking or comparison titles, never in how-to or definition titles.
- Never put a third-party product name in a title unless it is a tracked competitor.
- Write titles in the same language as the prompt and keep each under ${GEO_GAP_TITLE_MAX_LENGTH} characters.

Keyword rules:
- For each entry, list up to ${GSC_MAX_KEYWORDS_PER_SUGGESTION} exact source queries (copied verbatim from the list above) it was derived from. A query may appear in only one entry.`;
}
