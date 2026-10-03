import { competitorKey } from "../geo/domain";
import type {
  GeoAnswerMentionInput,
  GeoAnswerMentionKind,
  GeoAnswerMentionSpan,
  GeoAnswerMentionTerm,
} from "../types/geo";

const MIN_MENTION_PHRASE_LENGTH = 2;
const REGEXP_ESCAPE_REGEX = /[.*+?^${}()|[\]\\]/g;
const MENTION_WORD_CHAR = "[\\p{L}\\p{N}\\p{M}_]";

function escapeRegExp(value: string): string {
  return value.replace(REGEXP_ESCAPE_REGEX, "\\$&");
}

const MENTION_PATTERN_CACHE_MAX_ENTRIES = 2000;
// Characters whose Unicode simple case folding (what the "iu" regex uses)
// differs from toLowerCase(). Folding them keeps the substring prefilter a
// superset of what the regex matches.
const CASE_FOLD_EXCEPTIONS: Readonly<Record<string, string>> = {
  "\u017F": "s",
  "\u212A": "k",
  "\u212B": "\u00E5",
  "\u00B5": "\u03BC",
  "\u03C2": "\u03C3",
  "\u03D0": "\u03B2",
  "\u03D1": "\u03B8",
  "\u03D5": "\u03C6",
  "\u03D6": "\u03C0",
  "\u03F0": "\u03BA",
  "\u03F1": "\u03C1",
  "\u03F5": "\u03B5",
  "\u0345": "\u03B9",
  "\u1FBE": "\u03B9",
  "\u1E9B": "\u1E61",
};
const CASE_FOLD_EXCEPTION_REGEX = new RegExp(
  `[${Object.keys(CASE_FOLD_EXCEPTIONS).join("")}]`,
  "g"
);

function foldCase(value: string): string {
  return value
    .toLowerCase()
    .replace(
      CASE_FOLD_EXCEPTION_REGEX,
      (char) => CASE_FOLD_EXCEPTIONS[char] ?? char
    );
}
const mentionPatterns = new Map<string, RegExp>();

function mentionPattern(phrase: string): RegExp {
  const cached = mentionPatterns.get(phrase);
  if (cached) {
    cached.lastIndex = 0;
    return cached;
  }
  const pattern = new RegExp(
    `(?<!${MENTION_WORD_CHAR})${escapeRegExp(phrase)}(?!${MENTION_WORD_CHAR})`,
    "giu"
  );
  if (mentionPatterns.size >= MENTION_PATTERN_CACHE_MAX_ENTRIES) {
    mentionPatterns.clear();
  }
  mentionPatterns.set(phrase, pattern);
  return pattern;
}

function pushTerm(
  terms: GeoAnswerMentionTerm[],
  seen: Set<string>,
  phrase: string,
  kind: GeoAnswerMentionKind
) {
  const trimmed = phrase.trim();
  if (trimmed.length < MIN_MENTION_PHRASE_LENGTH) {
    return;
  }
  const key = competitorKey(trimmed);
  if (key.length === 0 || seen.has(key)) {
    return;
  }
  seen.add(key);
  terms.push({ phrase: trimmed, kind });
}

export function geoAnswerMentionTerms(
  input: GeoAnswerMentionInput
): GeoAnswerMentionTerm[] {
  const terms: GeoAnswerMentionTerm[] = [];
  const seen = new Set<string>();

  pushTerm(terms, seen, input.companyName ?? "", "own");
  for (const alias of input.aliases ?? []) {
    pushTerm(terms, seen, alias, "own");
  }

  for (const competitor of input.trackedCompetitors ?? []) {
    pushTerm(terms, seen, competitor.name, "competitor");
    for (const synonym of competitor.synonyms ?? []) {
      pushTerm(terms, seen, synonym, "competitor");
    }
  }

  for (const name of input.mentionedCompetitors ?? []) {
    pushTerm(terms, seen, name, "competitor");
  }

  return terms;
}

export function geoAnswerMentionSpans(
  text: string,
  terms: readonly GeoAnswerMentionTerm[]
): GeoAnswerMentionSpan[] {
  if (text.length === 0 || terms.length === 0) {
    return [];
  }

  const occupied = new Array<boolean>(text.length).fill(false);
  const spans: GeoAnswerMentionSpan[] = [];
  // With hundreds of tracked competitors most terms never occur, so a plain
  // substring check skips the regex for them.
  const foldedText = foldCase(text);
  const byLength = terms
    .filter((term) => foldedText.includes(foldCase(term.phrase)))
    .toSorted((left, right) => right.phrase.length - left.phrase.length);

  for (const term of byLength) {
    for (const match of text.matchAll(mentionPattern(term.phrase))) {
      const start = match.index;
      if (start === undefined) {
        continue;
      }
      const end = start + match[0].length;
      let overlaps = false;
      for (let index = start; index < end; index += 1) {
        if (occupied[index]) {
          overlaps = true;
          break;
        }
      }
      if (overlaps) {
        continue;
      }
      for (let index = start; index < end; index += 1) {
        occupied[index] = true;
      }
      spans.push({ start, end, kind: term.kind, phrase: term.phrase });
    }
  }

  return spans.toSorted((left, right) => left.start - right.start);
}
