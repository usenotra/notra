export const OPENCODE_COLORS = {
  background: "var(--opencode-tui-background, #fdfdfd)",
  surface: "var(--opencode-tui-surface, #f6f6f6)",
  foreground: "var(--opencode-tui-foreground, #1d1d1d)",
  muted: "var(--opencode-tui-muted, #929292)",
  subtle: "var(--opencode-tui-subtle, #dedede)",
  purple: "var(--opencode-tui-purple, #8256d6)",
  orange: "var(--opencode-tui-orange, #e48600)",
  green: "var(--opencode-tui-green, #00a861)",
} as const;

/** Beat before the first tool line during a replay. */
export const OPENCODE_SEARCH_HEADER_MS = 140;
/** Cadence between sequential tool lines. */
export const OPENCODE_SEARCH_QUERY_MS = 280;
/** Delay between cited-source rows. */
export const OPENCODE_SEARCH_STAGGER_MS = 56;
/** Pause after the last query before the sources block. */
export const OPENCODE_SEARCH_SOURCES_MS = 160;

export const OPENCODE_DARK_SOURCE_COLORS = {
  foreground: "#ececec",
  muted: "#a1a1a1",
  purple: "#bb9af7",
} as const;
