import type {
  ClaudeCodeEffort,
  ClaudeCodeEffortConfig,
  ClaudeCodeMode,
  ClaudeCodeModeConfig,
  ClaudeCodeTodoConfig,
  ClaudeCodeTodoStatus,
  ClaudeCodeToolCallConfig,
  ClaudeCodeToolCallStatus,
} from "../types/claude-code";

/** The order Shift+Tab walks through. */
export const CLAUDE_CODE_MODE_ORDER: ClaudeCodeMode[] = [
  "manual",
  "accept-edits",
  "plan",
  "auto",
  "bypass",
];

export const CLAUDE_CODE_EFFORT_ORDER: ClaudeCodeEffort[] = [
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
  "ultracode",
];

export const CLAUDE_CODE_MODES: Record<ClaudeCodeMode, ClaudeCodeModeConfig> = {
  "accept-edits": {
    className: "text-claude-code-mode-accept-edits",
    cycles: true,
    label: "⏵⏵ accept edits on",
  },
  auto: {
    className: "text-claude-code-mode-auto",
    cycles: true,
    label: "⏵⏵ auto mode on",
  },
  bypass: {
    className: "text-claude-code-mode-bypass",
    cycles: true,
    label: "⏵⏵ bypass permissions on",
  },
  manual: {
    className: "text-claude-code-muted",
    cycles: false,
    label: "? for shortcuts",
  },
  plan: {
    className: "text-claude-code-mode-plan",
    cycles: true,
    label: "⏸ plan mode on",
  },
};

export const CLAUDE_CODE_EFFORTS: Record<
  ClaudeCodeEffort,
  ClaudeCodeEffortConfig
> = {
  high: { className: "text-claude-code-muted", glyph: "◕" },
  low: { className: "text-claude-code-muted", glyph: "○" },
  max: { className: "text-claude-code-muted", glyph: "●" },
  medium: { className: "text-claude-code-muted", glyph: "◑" },
  ultracode: { className: "text-claude-code-accent", glyph: "✦" },
  xhigh: { className: "text-claude-code-muted", glyph: "◉" },
};

export const CLAUDE_CODE_TODOS: Record<
  ClaudeCodeTodoStatus,
  ClaudeCodeTodoConfig
> = {
  active: {
    glyph: "☐",
    labelClassName: "text-claude-code-strong font-bold",
    srLabel: "In progress",
  },
  done: {
    glyph: "☒",
    labelClassName: "text-claude-code-muted line-through",
    srLabel: "Done",
  },
  todo: {
    glyph: "☐",
    labelClassName: "text-claude-code-fg",
    srLabel: "To do",
  },
};

export const CLAUDE_CODE_TOOL_CALLS: Record<
  ClaudeCodeToolCallStatus,
  ClaudeCodeToolCallConfig
> = {
  error: { className: "text-claude-code-error", srLabel: "Failed" },
  pending: {
    className:
      "text-claude-code-muted animate-pulse motion-reduce:animate-none",
    srLabel: "Running",
  },
  success: { className: "text-claude-code-success", srLabel: "Done" },
};

/** The spinner glyphs, played forward then back. */
export const CLAUDE_CODE_SPINNER_FRAMES = ["·", "✢", "✳", "✶", "✻", "✽"];

export const CLAUDE_CODE_SPINNER_INTERVAL_MS = 120;

export const CLAUDE_CODE_RESULT_GLYPH = "⎿";

/** The mascot grid, in cells. */
export const CLAUDE_CODE_MASCOT_SIZE = { height: 14, width: 22 };

/**
 * The mascot's filled cells as `[x, y, width, height]` rectangles.
 * Eyes are cut out with a mask so the terminal background shows through.
 */
export const CLAUDE_CODE_MASCOT_BODY: [number, number, number, number][] = [
  [2, 0, 18, 10],
  [0, 4, 22, 3],
  [3, 10, 2, 4],
  [7, 10, 2, 4],
  [13, 10, 2, 4],
  [17, 10, 2, 4],
];

export const CLAUDE_CODE_MASCOT_EYES: [number, number, number, number][] = [
  [6, 2, 2, 3],
  [14, 2, 2, 3],
];
