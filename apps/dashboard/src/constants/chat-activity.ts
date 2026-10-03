export const ACTIVITY_AUTO_CLOSE_DELAY_MS = 800;
/** A step label must hold this long before it replaces the current one. */
export const ACTIVITY_STEP_SETTLE_MS = 300;
/** Each step label stays on screen at least this long. */
export const ACTIVITY_STEP_MIN_VISIBLE_MS = 900;
export const ACTIVITY_CONTENT_CLASSNAME =
  "h-[var(--collapsible-panel-height)] overflow-hidden text-sm text-muted-foreground outline-none transition-[height,opacity] duration-normal ease-emphasized motion-reduce:transition-none data-[ending-style]:h-0 data-[ending-style]:opacity-0 data-[starting-style]:h-0 data-[starting-style]:opacity-0";
export const SEARCH_TOOL_NAMES = ["webSearch", "search"] as const;
export const CONTENT_EDITOR_STANDALONE_TOOL_NAMES = [
  "editMarkdown",
  "reviseImage",
] as const;
export const VISIBLE_SEARCH_SOURCE_COUNT = 4;
