import type { ClaudeSpinnerFrame } from "../types/claude";

export const CLAUDE_SEARCH_VERB_HOLD_MS = 1100;

export const CLAUDE_SEARCH_QUERY_MS = 420;

export const CLAUDE_SEARCH_RESULTS_MS = 640;

export const CLAUDE_SEARCH_STEP_MS = 380;

export const CLAUDE_SPINNER_FRAME_MS = 120;

export const CLAUDE_SPINNER_VIEWBOX = 24;

export const CLAUDE_SPINNER_CENTER = 12;

export const CLAUDE_SPINNER_FRAMES: readonly ClaudeSpinnerFrame[] = [
  { inner: 0, outer: 0, rays: 0, strokeWidth: 0 },
  { inner: 1.35, jitter: 0.08, outer: 4.4, rays: 4, strokeWidth: 1.55 },
  { inner: 1.45, jitter: 0.1, outer: 5.3, rays: 8, strokeWidth: 1.45 },
  { inner: 1.3, jitter: 0.06, outer: 6.5, rays: 6, strokeWidth: 1.55 },
  { inner: 1.5, jitter: 0.12, outer: 6.9, rays: 8, strokeWidth: 1.5 },
  { inner: 1.65, jitter: 0.16, outer: 7.5, rays: 10, strokeWidth: 1.4 },
];

const SPINNER_FRAME_INDEXES = CLAUDE_SPINNER_FRAMES.map((_, index) => index);

export const CLAUDE_SPINNER_SEQUENCE: readonly number[] = [
  ...SPINNER_FRAME_INDEXES,
  ...[...SPINNER_FRAME_INDEXES].reverse().slice(1, -1),
];

export const CLAUDE_SPINNER_STATIC_FRAME = CLAUDE_SPINNER_FRAMES.length - 1;

export const CLAUDE_THINKING_VERBS = [
  "Untangling",
  "Pondering",
  "Gathering",
  "Sorting",
  "Weaving",
] as const;

export const CLAUDE_THINKING_INTERVAL_MS = 2200;

export const CLAUDE_COPIED_RESET_MS = 1500;

export const CLAUDE_TOOLTIP_DELAY_MS = 200;

export const CLAUDE_MODEL_MENU_OPEN_DELAY_MS = 75;

export const CLAUDE_MODEL_MENU_CLOSE_DELAY_MS = 200;

export const CLAUDE_PLUS_MENU_SKILLS = ["Docx", "PDF", "Spreadsheets"] as const;

export const CLAUDE_PLUS_MENU_CONNECTORS = [
  "GitHub",
  "Google Drive",
  "Slack",
] as const;

export const CLAUDE_PLUS_MENU_DESIGN_SYSTEMS = [
  "Notra UI",
  "shadcn/ui",
] as const;

export const CLAUDE_DEFAULT_CONTEXT_USAGE = 85;

export const CLAUDE_MENU_SURFACE_CLASS =
  "bg-claude-popover font-claude text-claude-fg ring-claude-popover-border rounded-2xl p-1.5 shadow-[0_4px_24px_var(--claude-popover-shadow)]";

export const CLAUDE_MENU_ITEM_CLASS =
  "text-claude-fg focus:bg-claude-hover focus:text-claude-fg not-data-[variant=destructive]:focus:**:text-claude-fg data-highlighted:bg-claude-hover h-8 cursor-pointer gap-2.5 rounded-lg px-2.5 py-0 text-sm leading-5 [&_svg:not([class*='size-'])]:size-4.5";

export const CLAUDE_HOVER_OPEN_DELAY_MS = 150;

export const CLAUDE_HOVER_CLOSE_DELAY_MS = 100;
