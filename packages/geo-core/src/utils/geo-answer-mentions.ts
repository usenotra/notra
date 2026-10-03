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
const ASCII_ONLY_REGEX = /^[\u0020-\u007E]*$/;
// Under Unicode simple case folding (the "iu" flags) only U+017F (long s) and
// U+212A (Kelvin sign) fold to ASCII letters. toLowerCase() already maps the
// Kelvin sign to "k", so mapping long s makes a substring check an exact
// prefilter for ASCII phrases.
const LONG_S_REGEX = /\u017F/g;

/** True when the "iu" mention regex for `phrase` could match `foldedText`. */
function mayContainMention(foldedText: string, phrase: string): boolean {
  if (!ASCII_ONLY_REGEX.test(phrase)) {
    // Non-ASCII folding has too many special cases to mirror; let the
    // regex decide.
    return true;
  }
  return foldedText.includes(phrase.toLowerCase());
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
  // With hundreds of tracked competitors most terms never occur, so a
  // substring check skips the regex for them.
  const foldedText = text.toLowerCase().replace(LONG_S_REGEX, "s");
  const byLength = terms
    .filter((term) => mayContainMention(foldedText, term.phrase))
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
