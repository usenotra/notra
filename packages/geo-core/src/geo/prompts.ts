import { GEO_MAX_PROMPTS } from "../constants/geo";
import type {
  GeoBrandContext,
  GeoPromptDefinition,
  GeoSettings,
  GeoTrackedPrompt,
} from "../types/geo";
import {
  buildBrandTerms,
  promptMentionsBrand,
  stripBrandTerms,
} from "./suggestion-keywords";

const CUSTOM_PROMPT_SCAN_ID_PREFIX = "custom-";
const SEQUENCE_PROMPT_SCAN_ID_PREFIX = "sequence-";

const GEO_AUTO_PROMPT_IDS = [
  "best-tools",
  "alternatives",
  "recommendation",
  "comparison",
  "what-is",
  "how-to-choose",
  "top-list",
  "audience-specific",
] as const;

const GEO_AUTO_PROMPT_ID_SET = new Set<string>(GEO_AUTO_PROMPT_IDS);

export function isGeoAutoPromptId(promptId: string): boolean {
  return GEO_AUTO_PROMPT_ID_SET.has(promptId);
}

type AutoPromptChange = "pause" | "resume" | "remove";

export function applyAutoPromptChange(
  pausedAutoPromptIds: readonly string[],
  removedAutoPromptIds: readonly string[],
  promptId: string,
  change: AutoPromptChange
): {
  pausedAutoPromptIds: string[];
  removedAutoPromptIds: string[];
} {
  const paused = new Set(pausedAutoPromptIds);
  const removed = new Set(removedAutoPromptIds);
  if (change === "remove") {
    removed.add(promptId);
    paused.delete(promptId);
  } else if (change === "pause") {
    if (!removed.has(promptId)) {
      paused.add(promptId);
    }
  } else {
    paused.delete(promptId);
  }
  return {
    pausedAutoPromptIds: [...paused],
    removedAutoPromptIds: [...removed],
  };
}

export function toAutoTrackedPrompts(
  autoPrompts: readonly GeoPromptDefinition[],
  pausedAutoPromptIds: readonly string[],
  removedAutoPromptIds: readonly string[]
): GeoTrackedPrompt[] {
  const paused = new Set(pausedAutoPromptIds);
  const removed = new Set(removedAutoPromptIds);
  const prompts: GeoTrackedPrompt[] = [];
  for (const autoPrompt of autoPrompts) {
    if (removed.has(autoPrompt.id)) {
      continue;
    }
    prompts.push({
      id: autoPrompt.id,
      prompt: autoPrompt.text,
      enabled: !paused.has(autoPrompt.id),
      source: "auto",
      tags: [],
      createdAt: null,
    });
  }
  return prompts;
}

export function isAutoPromptScanned(
  promptId: string,
  pausedAutoPromptIds: ReadonlySet<string>,
  removedAutoPromptIds: ReadonlySet<string>
): boolean {
  return (
    !pausedAutoPromptIds.has(promptId) && !removedAutoPromptIds.has(promptId)
  );
}

/**
 * Scan results are recorded under a namespaced prompt id for custom prompts
 * (`custom-<uuid>`) so they never collide with the slug ids of auto prompts.
 */
export function customPromptScanId(promptId: string): string {
  return `${CUSTOM_PROMPT_SCAN_ID_PREFIX}${promptId}`;
}

/** The prompt id under which a tracked prompt's scan results are stored. */
export function trackedPromptScanId(
  prompt: Pick<GeoTrackedPrompt, "id" | "source">
): string {
  return prompt.source === "custom" ? customPromptScanId(prompt.id) : prompt.id;
}

export function isCustomPromptScanId(promptId: string): boolean {
  return promptId.startsWith(CUSTOM_PROMPT_SCAN_ID_PREFIX);
}

export function isConversationScanPromptId(promptId: string): boolean {
  return promptId.startsWith(SEQUENCE_PROMPT_SCAN_ID_PREFIX);
}

export function shouldSkipUnmatchedGapScan(
  scanId: string,
  matchedScanIds: ReadonlySet<string>,
  removedAutoPromptIds: ReadonlySet<string>
): boolean {
  return (
    matchedScanIds.has(scanId) ||
    isConversationScanPromptId(scanId) ||
    isCustomPromptScanId(scanId) ||
    removedAutoPromptIds.has(scanId)
  );
}

export function promptIdFromScanId(scanId: string): string {
  return scanId.startsWith(CUSTOM_PROMPT_SCAN_ID_PREFIX)
    ? scanId.slice(CUSTOM_PROMPT_SCAN_ID_PREFIX.length)
    : scanId;
}

export function scopeGeoPrompts(
  prompts: readonly GeoPromptDefinition[],
  promptIds: readonly string[]
): GeoPromptDefinition[] {
  const scanIds = new Set<string>();
  for (const promptId of promptIds) {
    scanIds.add(promptId);
    scanIds.add(customPromptScanId(promptId));
  }
  return prompts.filter((prompt) => scanIds.has(prompt.id));
}

/**
 * Mention checks for custom prompts are keyed by `custom-<uuid>`. Fall back to
 * the raw id so auto-generated slugs (`best-tools`) and legacy rows still match.
 */
export function findPromptMentionEntry<T>(
  byPrompt: Map<string, T>,
  promptId: string
): T | undefined {
  return byPrompt.get(customPromptScanId(promptId)) ?? byPrompt.get(promptId);
}

const SENTENCE_SPLIT_REGEX = /[.!?]/;
const LEADING_FILLER_REGEX =
  /^(we are|we're|we|it is|it's|the|a|an|our)\s+(the\s+|a\s+|an\s+)?/i;
const IS_A_FOR_REGEX =
  /\b(?:is|are|was|were)\s+(?:a|an|the)\s+(.+?)\s+for\s+(.+)$/i;
const IS_A_REGEX = /\b(?:is|are|was|were)\s+(?:a|an|the)\s+(.+)$/i;
const HELP_VERB_REGEX =
  /\bhelps?\s+.+\s+(generate|create|send|build|track|manage|automate|write|deliver|host)\s+(.+)$/i;
const TO_VERB_REGEX =
  /\bto\s+(generate|create|send|build|track|manage|automate|write|deliver|host)\s+(.+)$/i;
const WRAPPER_NOUN_REGEX =
  /\b(platform|tool|software|solution|service|app|product|toolkit|suite|system)\b/gi;
const TYPE_BEFORE_WRAPPER_REGEX =
  /^(.+?)\s+(?:platform|tool|software|solution|service|app|product|toolkit|suite|system)\b/i;
const TRAILING_FLUFF_REGEX = /\s+(built|designed|made|created|used|offered)$/i;
const TRAILING_HYPE_REGEX =
  /\s+(at scale|in the cloud|worldwide|globally|online|today)$/i;
const AUDIENCE_LIKE_REGEX =
  /\b(teams?|companies|businesses|developers|marketers|startups|enterprises|agencies|people|users|customers|organizations|founders|engineers|designers)\b/i;
const GERUND_REGEX =
  /^(sending|building|creating|generating|managing|tracking|automating|writing|hosting|processing|analyzing|monitoring|delivering|integrating)\b/i;
const WEAK_CATEGORY_REGEX =
  /^(developer|modern|powerful|simple|easy|best|leading|innovative|next-gen|next generation)$/i;
const SENTENCE_LEFTOVER_REGEX = /\b(is|are|was|were)\b/;
const WHITESPACE_REGEX = /\s+/;
const TRAILING_PUNCTUATION_REGEX = /[\s,;:.-]+$/;

const CATEGORY_MAX_WORDS = 6;
const CATEGORY_FALLBACK = "this space";
const AUDIENCE_MAX_WORDS = 10;

function condense(value: string, maxWords: number): string {
  return value
    .trim()
    .split(WHITESPACE_REGEX)
    .slice(0, maxWords)
    .join(" ")
    .replace(TRAILING_PUNCTUATION_REGEX, "");
}

function cleanPhrase(value: string): string {
  return value
    .replace(TRAILING_HYPE_REGEX, "")
    .replace(TRAILING_FLUFF_REGEX, "")
    .replace(TRAILING_PUNCTUATION_REGEX, "")
    .replace(WHITESPACE_REGEX, " ")
    .trim();
}

function nounPhraseFromType(typePhrase: string): string {
  const trimmed = cleanPhrase(typePhrase);
  const beforeWrapper = trimmed.match(TYPE_BEFORE_WRAPPER_REGEX)?.[1];
  if (beforeWrapper && !WEAK_CATEGORY_REGEX.test(beforeWrapper.trim())) {
    return cleanPhrase(beforeWrapper);
  }
  return cleanPhrase(trimmed.replace(WRAPPER_NOUN_REGEX, ""));
}

function finalizeCategory(value: string, brandTerms: string[]): string | null {
  const stripped = stripBrandTerms(cleanPhrase(value), brandTerms);
  const condensed = condense(stripped, CATEGORY_MAX_WORDS).toLowerCase();
  if (
    condensed.length === 0 ||
    WEAK_CATEGORY_REGEX.test(condensed) ||
    SENTENCE_LEFTOVER_REGEX.test(condensed)
  ) {
    return null;
  }
  if (promptMentionsBrand(condensed, brandTerms)) {
    return null;
  }
  return condensed;
}

function deriveCategory(
  companyDescription: string | null,
  brandTerms: string[]
): string {
  if (!companyDescription) {
    return CATEGORY_FALLBACK;
  }
  const firstSentence = companyDescription.split(SENTENCE_SPLIT_REGEX).at(0);
  if (!firstSentence) {
    return CATEGORY_FALLBACK;
  }

  const stripped = stripBrandTerms(firstSentence.trim(), brandTerms);
  if (!stripped) {
    return CATEGORY_FALLBACK;
  }

  const isAFor = stripped.match(IS_A_FOR_REGEX);
  if (isAFor?.[1] && isAFor[2]) {
    const useCase = cleanPhrase(isAFor[2]);
    const typePhrase = nounPhraseFromType(isAFor[1]);
    let preferred = typePhrase || useCase;
    if (GERUND_REGEX.test(useCase)) {
      preferred = useCase;
    } else if (AUDIENCE_LIKE_REGEX.test(useCase)) {
      preferred = typePhrase;
    }
    const category = finalizeCategory(preferred, brandTerms);
    if (category) {
      return category;
    }
  }

  const isA = stripped.match(IS_A_REGEX);
  if (isA?.[1]) {
    const category = finalizeCategory(nounPhraseFromType(isA[1]), brandTerms);
    if (category) {
      return category;
    }
  }

  const helpVerb = stripped.match(HELP_VERB_REGEX);
  if (helpVerb?.[1] && helpVerb[2]) {
    const category = finalizeCategory(
      `${helpVerb[1]} ${helpVerb[2]}`,
      brandTerms
    );
    if (category) {
      return category;
    }
  }

  const toVerb = stripped.match(TO_VERB_REGEX);
  if (toVerb?.[1] && toVerb[2]) {
    const category = finalizeCategory(`${toVerb[1]} ${toVerb[2]}`, brandTerms);
    if (category) {
      return category;
    }
  }

  const leftover = stripped
    .replace(LEADING_FILLER_REGEX, "")
    .replace(WRAPPER_NOUN_REGEX, "");
  return finalizeCategory(leftover, brandTerms) ?? CATEGORY_FALLBACK;
}

function deriveAudience(
  audience: string | null,
  brandTerms: string[]
): string | null {
  if (!audience) {
    return null;
  }
  const stripped = stripBrandTerms(audience, brandTerms);
  const condensed = condense(stripped, AUDIENCE_MAX_WORDS).toLowerCase();
  if (condensed.length === 0 || promptMentionsBrand(condensed, brandTerms)) {
    return null;
  }
  return condensed;
}

export function generatedAutoPromptIds(
  settings: Pick<GeoSettings, "companyName" | "aliases">,
  brand: GeoBrandContext | null
): Set<string> {
  return new Set(buildGeoPrompts(settings, brand).map((prompt) => prompt.id));
}

export function buildGeoPrompts(
  settings: Pick<GeoSettings, "companyName" | "aliases">,
  brand: GeoBrandContext | null
): GeoPromptDefinition[] {
  const brandTerms = buildBrandTerms(settings);
  const category = deriveCategory(
    brand?.companyDescription ?? null,
    brandTerms
  );
  const audience = deriveAudience(brand?.audience ?? null, brandTerms);

  const prompts: GeoPromptDefinition[] = [
    { id: "best-tools", text: `what tools should I use for ${category}` },
    {
      id: "alternatives",
      text: `what's a good alternative for ${category}`,
    },
    {
      id: "recommendation",
      text: `what tool can I use for ${category}`,
    },
    {
      id: "comparison",
      text: `what tools should I compare for ${category}`,
    },
    {
      id: "what-is",
      text: `how do I get started with ${category}`,
    },
    {
      id: "how-to-choose",
      text: `how do I pick a tool for ${category}`,
    },
    {
      id: "top-list",
      text: `what tools should I look at for ${category}`,
    },
  ];

  if (audience) {
    prompts.push({
      id: "audience-specific",
      text: `what tools should I use for ${category} for ${audience}`,
    });
  }

  return prompts
    .filter((prompt) => !promptMentionsBrand(prompt.text, brandTerms))
    .slice(0, GEO_MAX_PROMPTS);
}
