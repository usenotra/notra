import { GITHUB_MENTION_SUGGESTION } from "@notra/ai/constants/github-mention";
import type {
  GitHubMentionLineHunk,
  GitHubMentionLineRange,
  GitHubMentionSuggestion,
} from "@notra/ai/types/github-mention";

const HUNK_HEADER_PATTERN = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/;
const BACKTICK_RUN_PATTERN = /`{3,}/g;
const FINAL_NEWLINE_PATTERN = /\n$/;

function commonPrefixLength(a: readonly string[], b: readonly string[]) {
  let length = 0;
  while (length < a.length && length < b.length && a[length] === b[length]) {
    length++;
  }
  return length;
}

function commonSuffixLength(
  a: readonly string[],
  b: readonly string[],
  prefix: number
) {
  let length = 0;
  while (
    length < a.length - prefix &&
    length < b.length - prefix &&
    a.at(-1 - length) === b.at(-1 - length)
  ) {
    length++;
  }
  return length;
}

/** Longest common subsequence table of the two middles, filled from the end. */
function lcsTable(a: readonly string[], b: readonly string[]) {
  const width = b.length + 1;
  const table = new Uint32Array((a.length + 1) * width);
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      table[i * width + j] =
        a[i] === b[j]
          ? (table[(i + 1) * width + j + 1] ?? 0) + 1
          : Math.max(
              table[(i + 1) * width + j] ?? 0,
              table[i * width + j + 1] ?? 0
            );
    }
  }
  return table;
}

function diffLines(previous: readonly string[], next: readonly string[]) {
  const prefix = commonPrefixLength(previous, next);
  const suffix = commonSuffixLength(previous, next, prefix);
  const a = previous.slice(prefix, previous.length - suffix);
  const b = next.slice(prefix, next.length - suffix);
  if (a.length === 0 && b.length === 0) {
    return [];
  }
  // A full rewrite is one hunk anyway, and the table would only cost memory.
  if (a.length * b.length > GITHUB_MENTION_SUGGESTION.diffCellLimit) {
    return [{ oldStart: prefix + 1, oldCount: a.length, newLines: b }];
  }

  const table = lcsTable(a, b);
  const width = b.length + 1;
  const hunks: GitHubMentionLineHunk[] = [];
  let open: GitHubMentionLineHunk | null = null;
  let i = 0;
  let j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) {
      open = null;
      i++;
      j++;
      continue;
    }
    if (!open) {
      open = { oldStart: prefix + i + 1, oldCount: 0, newLines: [] };
      hunks.push(open);
    }
    const dropOld =
      j >= b.length ||
      (i < a.length &&
        (table[(i + 1) * width + j] ?? 0) >= (table[i * width + j + 1] ?? 0));
    if (dropOld) {
      open.oldCount++;
      i++;
    } else {
      open.newLines.push(b[j] ?? "");
      j++;
    }
  }
  return hunks;
}

/** The old lines a hunk needs a suggestion to cover. An insertion borrows a neighbour. */
function rangeOf(
  hunk: GitHubMentionLineHunk,
  previousLength: number
): GitHubMentionLineRange {
  if (hunk.oldCount > 0) {
    return {
      startLine: hunk.oldStart,
      line: hunk.oldStart + hunk.oldCount - 1,
    };
  }
  const anchor = Math.min(Math.max(hunk.oldStart - 1, 1), previousLength);
  return { startLine: anchor, line: anchor };
}

function renderRange(
  previous: readonly string[],
  hunks: readonly GitHubMentionLineHunk[],
  range: GitHubMentionLineRange
) {
  const lines: string[] = [];
  let cursor = range.startLine;
  for (const hunk of hunks) {
    lines.push(...previous.slice(cursor - 1, hunk.oldStart - 1));
    lines.push(...hunk.newLines);
    cursor = hunk.oldStart + hunk.oldCount;
  }
  lines.push(...previous.slice(cursor - 1, range.line));
  return lines;
}

/**
 * Real lines only: the empty string after a final newline is not a line GitHub
 * can comment on, and a model that drops the final newline changed nothing.
 */
function splitLines(text: string) {
  return text.replace(FINAL_NEWLINE_PATTERN, "").split("\n");
}

/**
 * Turns "this file should read like that" into GitHub suggestions: one per
 * changed region, each replacing a range of the current lines. Regions a blank
 * line apart are merged, so a reworked section stays one suggestion.
 */
export function buildGitHubMentionSuggestions(params: {
  path: string;
  previous: string;
  next: string;
}): GitHubMentionSuggestion[] {
  const previous = splitLines(params.previous);
  const hunks = diffLines(previous, splitLines(params.next));
  const groups: Array<{
    range: GitHubMentionLineRange;
    hunks: GitHubMentionLineHunk[];
  }> = [];
  for (const hunk of hunks) {
    const range = rangeOf(hunk, previous.length);
    const last = groups.at(-1);
    if (
      last &&
      range.startLine - last.range.line - 1 <=
        GITHUB_MENTION_SUGGESTION.mergeGap
    ) {
      last.range.line = Math.max(last.range.line, range.line);
      last.hunks.push(hunk);
    } else {
      groups.push({ range, hunks: [hunk] });
    }
  }
  return groups.map((group) => ({
    path: params.path,
    startLine: group.range.startLine,
    line: group.range.line,
    previousLines: previous.slice(group.range.startLine - 1, group.range.line),
    replacement: renderRange(previous, group.hunks, group.range),
  }));
}

/**
 * Widens suggestions to one range, the lines of the review thread the mention
 * came from, so the answer can sit in that thread. Null when a change falls
 * outside the range.
 */
export function fitGitHubMentionSuggestionsToRange(params: {
  suggestions: readonly GitHubMentionSuggestion[];
  previous: string;
  range: GitHubMentionLineRange;
}): GitHubMentionSuggestion | null {
  const [first] = params.suggestions;
  const isInside = params.suggestions.every(
    (suggestion) =>
      suggestion.path === first?.path &&
      suggestion.startLine >= params.range.startLine &&
      suggestion.line <= params.range.line
  );
  if (!(first && isInside)) {
    return null;
  }
  const previous = splitLines(params.previous);
  const replacement: string[] = [];
  let cursor = params.range.startLine;
  for (const suggestion of params.suggestions) {
    replacement.push(...previous.slice(cursor - 1, suggestion.startLine - 1));
    replacement.push(...suggestion.replacement);
    cursor = suggestion.line + 1;
  }
  replacement.push(...previous.slice(cursor - 1, params.range.line));
  return {
    path: first.path,
    startLine: params.range.startLine,
    line: params.range.line,
    previousLines: previous.slice(
      params.range.startLine - 1,
      params.range.line
    ),
    replacement,
  };
}

/** Lines of the new file GitHub accepts a review comment on: the diff hunks. */
export function commentableLinesFromPatch(patch: string | null) {
  const lines = new Set<number>();
  let newLine = 0;
  for (const line of (patch ?? "").split("\n")) {
    const header = line.match(HUNK_HEADER_PATTERN);
    if (header) {
      newLine = Number(header[1]);
    } else if (line.startsWith("+") || line.startsWith(" ")) {
      lines.add(newLine);
      newLine++;
    }
  }
  return lines;
}

export function isGitHubMentionSuggestionCommentable(
  suggestion: GitHubMentionLineRange,
  commentable: ReadonlySet<number>
) {
  for (let line = suggestion.startLine; line <= suggestion.line; line++) {
    if (!commentable.has(line)) {
      return false;
    }
  }
  return true;
}

/** One backtick longer than any fence inside, so code samples stay intact. */
function fenceFor(lines: readonly string[]) {
  let longest = 2;
  for (const line of lines) {
    for (const run of line.match(BACKTICK_RUN_PATTERN) ?? []) {
      longest = Math.max(longest, run.length);
    }
  }
  return "`".repeat(longest + 1);
}

export function formatGitHubMentionSuggestionBlock(
  replacement: readonly string[]
) {
  const fence = fenceFor(replacement);
  return `${fence}suggestion\n${replacement.join("\n")}\n${fence}`;
}

/** Same change as a plain diff, for places GitHub cannot render a suggestion. */
export function formatGitHubMentionSuggestionDiff(
  suggestion: GitHubMentionSuggestion
) {
  const lines = [
    ...suggestion.previousLines.map((line) => `-${line}`),
    ...suggestion.replacement.map((line) => `+${line}`),
  ];
  const fence = fenceFor(lines);
  return `${fence}diff\n${lines.join("\n")}\n${fence}`;
}
