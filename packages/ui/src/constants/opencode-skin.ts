import type {
  OpencodeActivityKind,
  OpencodeMcpServer,
  OpencodeMcpStatus,
} from "@notra/ui/types/opencode-skin";

export const OPENCODE_DEFAULT_AGENT = "Build";
export const OPENCODE_DEFAULT_MODEL = "Writer 0.1";
export const OPENCODE_DEFAULT_PROVIDER = "Notra";
export const OPENCODE_DEFAULT_EFFORT = "high";
export const OPENCODE_DEFAULT_PLACEHOLDER =
  'Ask anything... "Draft this week\'s changelog"';
export const OPENCODE_DEFAULT_VERSION = "1.18.33";
export const OPENCODE_DEFAULT_CWD = "~/acme/web";

export const OPENCODE_DEFAULT_SERVERS: OpencodeMcpServer[] = [
  { name: "notra", status: "Connected" },
  { name: "github", status: "Connected" },
  { name: "linear", status: "Connected" },
];

export const OPENCODE_MCP_STATUS_CLASS: Record<OpencodeMcpStatus, string> = {
  Connected: "text-opencode-tui-green",
  Disconnected: "text-opencode-tui-muted",
  Failed: "text-opencode-tui-orange",
};

/** Glyph in front of each activity line, by kind. Thoughts have none. */
export const OPENCODE_ACTIVITY_GLYPH: Record<OpencodeActivityKind, string> = {
  read: "→",
  search: "◈",
  thought: "",
  tool: "⚙",
};

export const OPENCODE_ACTIVITY_LABEL: Record<OpencodeActivityKind, string> = {
  read: "Read",
  search: "Web Search",
  thought: "Thought",
  tool: "Tool",
};

/** Braille frames of the `Thinking` spinner. */
export const OPENCODE_THINKING_FRAMES = [
  "⠋",
  "⠙",
  "⠹",
  "⠸",
  "⠼",
  "⠴",
  "⠦",
  "⠧",
  "⠇",
  "⠏",
] as const;
export const OPENCODE_THINKING_FRAME_MS = 80;

/** Cells in the status-row scanner. */
export const OPENCODE_PROGRESS_CELLS = 8;
export const OPENCODE_PROGRESS_FRAME_MS = 90;
/** Opacity of the scanner head and the cells trailing behind it. */
export const OPENCODE_PROGRESS_TRAIL = [1, 0.55, 0.32, 0.18] as const;

/** Beat before the first search line during a replay. */
export const OPENCODE_SEARCH_HEADER_MS = 140;
/** Cadence between sequential search lines. */
export const OPENCODE_SEARCH_QUERY_MS = 280;
/** Delay between cited-source rows. */
export const OPENCODE_SEARCH_STAGGER_MS = 56;
/** Pause after the last query before the sources block. */
export const OPENCODE_SEARCH_SOURCES_MS = 160;

/**
 * The wordmark on a 39 by 7 cell grid, one string per row. `o` paints the
 * dim "open" half, `c` the bright "code" half and `+` the letter counters.
 */
export const OPENCODE_LOGO_ROWS = [
  ".................................c.....",
  "oooo.oooo.oooo.ooo..cccc.cccc.cccc.cccc",
  "o++o.o++o.o++o.o..o.c....c++c.c++c.c++c",
  "o++o.o++o.oooo.o..o.c....c++c.c++c.cccc",
  "o++o.oooo.o....o..o.c....c++c.c++c.c...",
  "oooo.o....oooo.o..o.cccc.cccc.cccc.cccc",
  ".....o.................................",
] as const;
/** Size of one logo cell in SVG units. */
export const OPENCODE_LOGO_CELL = 6;
