import { competitorKey } from "../geo/domain";
import type {
  GeoAnswerMentionInput,
  GeoAnswerMentionKind,
  GeoAnswerMentionSpan,
  GeoAnswerMentionTerm,
} from "../types/geo";

const MIN_MENTION_PHRASE_LENGTH = 2;
const REGEXP_ESCAPE_REGEX = /[.*+?^${}()|[\]\\]/g;

function escapeRegExp(value: string): string {
  return value.replace(REGEXP_ESCAPE_REGEX, "\\$&");
}

function mentionPattern(phrase: string): RegExp {
  return new RegExp(
    `(?<![\\p{L}\\p{N}_])${escapeRegExp(phrase)}(?![\\p{L}\\p{N}_])`,
    "giu"
  );
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
  const byLength = terms.toSorted(
    (left, right) => right.phrase.length - left.phrase.length
  );

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
