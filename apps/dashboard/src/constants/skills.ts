export const SKILL_EDITOR_VIEWS = ["edit", "diff"] as const;

export const SKILL_EDITOR_VIEW_LABELS = {
  edit: "Edit",
  diff: "Diff",
} as const;

export const SKILL_SORT_KEYS = ["name", "updatedAt"] as const;

export const SKILL_TABLE_SKELETON_ROWS = 6;

/** Transition types tagged on navigations between the skill list and a skill. */
export const SKILL_NAV_TRANSITION_TYPES = {
  forward: "skill-nav-forward",
  back: "skill-nav-back",
} as const;

/** `view-transition-class` per navigation type, styled in `globals.css`. */
export const SKILL_NAV_TRANSITION_CLASSES = {
  [SKILL_NAV_TRANSITION_TYPES.forward]: "skill-swoosh-forward",
  [SKILL_NAV_TRANSITION_TYPES.back]: "skill-swoosh-back",
  default: "none",
} as const;

/** Derived update states of a system skill copy. */
export const SKILL_STATUSES = [
  "current",
  "update-available",
  "modified",
  "conflict",
] as const;

/** Query param that opens the update review dialog on the skill page. */
export const SKILL_REVIEW_QUERY_PARAM = "review";

export const SKILL_DIFF_FILE_NAME = "SKILL.md";

export const SKILL_DIFF_LANGUAGE = "markdown";

/** Neutral shiki pair; the dashboard picks one via `next-themes`. */
export const SKILL_DIFF_THEMES = {
  light: "github-light",
  dark: "github-dark",
} as const;

/**
 * Git conflict markers, matching what `@pierre/diffs` parses out of a file so
 * our own resolver and its renderer always agree on the regions.
 */
export const SKILL_CONFLICT_START_REGEX = /^<{7,}(?:\s.*)?$/;

export const SKILL_CONFLICT_SEPARATOR_REGEX = /^={7,}$/;

export const SKILL_CONFLICT_END_REGEX = /^>{7,}(?:\s.*)?$/;
