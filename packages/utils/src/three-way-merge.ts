import { merge } from "node-diff3";

/**
 * Line-based three-way merge used by the skill update panel (and, later, the
 * CLI) to combine a user's fork of a system skill with a newer upstream
 * version.
 */
export interface ThreeWayMergeInput {
  /** The version both sides were forked from. */
  base: string;
  /** The local text, i.e. the org's current skill content. */
  mine: string;
  /** The incoming text, i.e. the latest published version. */
  theirs: string;
  /** Names written into the conflict markers. */
  labels?: {
    mine: string;
    theirs: string;
  };
}

export interface ThreeWayMergeResult {
  /** Merged text; conflicting regions carry git-style conflict markers. */
  text: string;
  hasConflicts: boolean;
  conflictCount: number;
}

const DEFAULT_LABELS = {
  mine: "mine",
  theirs: "theirs",
} as const;

const CONFLICT_START_MARKER = "<<<<<<<";

function buildStartMarker(label: string): string {
  return label ? `${CONFLICT_START_MARKER} ${label}` : CONFLICT_START_MARKER;
}

/**
 * Merges `mine` and `theirs` on top of `base`, line by line. Identical edits on
 * both sides are not reported as conflicts (`excludeFalseConflicts`), so only
 * genuinely divergent regions end up marked.
 *
 * Markers are the git ones — `<<<<<<< label`, `=======`, `>>>>>>> label` — so
 * the output can be handed to a resolver that parses git conflicts.
 *
 * The three texts are split into line arrays before they reach `node-diff3`.
 * That matters: the library's default `stringSeparator` is `/\s+/`, so handing
 * it raw strings would diff word by word and rejoin the result with single
 * spaces, destroying every blank line and indent in a markdown skill. Arrays
 * bypass the separator entirely, and splitting on `"\n"` (rather than
 * `/\r?\n/`) keeps a trailing `\r` inside the line so CRLF input round-trips
 * byte for byte.
 */
export function mergeThreeWay({
  base,
  mine,
  theirs,
  labels = DEFAULT_LABELS,
}: ThreeWayMergeInput): ThreeWayMergeResult {
  const result = merge(mine.split("\n"), base.split("\n"), theirs.split("\n"), {
    excludeFalseConflicts: true,
    label: { a: labels.mine, b: labels.theirs },
  });

  const startMarker = buildStartMarker(labels.mine);
  let conflictCount = 0;
  for (const line of result.result) {
    if (line === startMarker) {
      conflictCount += 1;
    }
  }

  return {
    text: result.result.join("\n"),
    hasConflicts: result.conflict,
    conflictCount,
  };
}
