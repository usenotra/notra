import type {
  ClaudeCodeEffort,
  ClaudeCodeEffortConfig,
  ClaudeCodeMode,
  ClaudeCodeModeConfig,
  ClaudeCodeTodoStatus,
  ClaudeCodeToolCallStatus,
} from "../types/claude-code";

export const CLAUDE_CODE_LOGO_BITS = [
  "000111111111111000",
  "000110111111011000",
  "011111111111111110",
  "000111111111111000",
  "000010100001010000",
] as const;

export const CLAUDE_CODE_LOGO_PIXEL_HEIGHT = 2.4;

export const CLAUDE_CODE_MODES: Record<ClaudeCodeMode, ClaudeCodeModeConfig> = {
  auto: {
    className: "text-claude-code-mode-auto",
    glyph: "⏵⏵",
    hints: [
      { keys: "shift+tab", label: "to cycle", parenthesized: true },
      { keys: "←", label: "for agents" },
    ],
    label: "auto mode on",
  },
  manual: {
    className: "text-claude-code-muted",
    glyph: "⏸",
    hints: [
      { keys: "?", label: "for shortcuts" },
      { keys: "←", label: "for agents" },
    ],
    leadingDot: true,
    label: "manual mode on",
  },
  "accept-edits": {
    className: "text-claude-code-mode-accept-edits",
    glyph: "⏵⏵",
    hints: [
      { keys: "shift+tab", label: "to cycle", parenthesized: true },
      { keys: "←", label: "for agents" },
    ],
    label: "accept edits on",
  },
  plan: {
    className: "text-claude-code-mode-plan",
    glyph: "⏸",
    hints: [
      { keys: "shift+tab", label: "to cycle", parenthesized: true },
      { keys: "←", label: "for agents" },
    ],
    label: "plan mode on",
  },
  bypass: {
    className: "text-claude-code-mode-bypass",
    glyph: "⏵⏵",
    hints: [{ keys: "shift+tab", label: "to cycle", parenthesized: true }],
    label: "bypass permissions on",
  },
};

export const CLAUDE_CODE_MODE_ORDER: ClaudeCodeMode[] = [
  "auto",
  "manual",
  "accept-edits",
  "plan",
  "bypass",
];

export const CLAUDE_CODE_EFFORTS: Record<
  ClaudeCodeEffort,
  ClaudeCodeEffortConfig
> = {
  low: { glyph: "○", label: "low · /effort" },
  medium: { glyph: "◐", label: "medium · /effort" },
  high: { glyph: "●", label: "high · /effort" },
  xhigh: { glyph: "◉", label: "xhigh · /effort" },
  max: { glyph: "◈", label: "max · /effort" },
  ultracode: {
    glyph: "✦",
    label:
      "ultracode · xhigh effort + dynamic workflows for maximum thoroughness",
    rainbow: true,
  },
};

export const CLAUDE_CODE_EFFORT_ORDER: ClaudeCodeEffort[] = [
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
  "ultracode",
];

export const CLAUDE_CODE_TODO_GLYPHS: Record<ClaudeCodeTodoStatus, string> = {
  active: "◼",
  done: "✔",
  todo: "◻",
};

export const CLAUDE_CODE_TODO_GLYPH_CLASSES: Record<
  ClaudeCodeTodoStatus,
  string
> = {
  active: "text-claude-code-todo-active",
  done: "text-claude-code-todo-done",
  todo: "text-claude-code-muted",
};

export const CLAUDE_CODE_TODO_LABEL_CLASSES: Record<
  ClaudeCodeTodoStatus,
  string
> = {
  active: "text-claude-code-strong font-semibold",
  done: "text-claude-code-muted line-through",
  todo: "text-claude-code-muted",
};

export const CLAUDE_CODE_TODO_STATUS_LABELS: Record<
  ClaudeCodeTodoStatus,
  string
> = {
  active: "in progress",
  done: "completed",
  todo: "pending",
};

export const CLAUDE_CODE_TOOL_STATUS_CLASSES: Record<
  ClaudeCodeToolCallStatus,
  string
> = {
  error: "text-claude-code-error",
  pending: "text-claude-code-pending",
  success: "text-claude-code-success",
};

export const CLAUDE_CODE_TOOL_STATUS_LABELS: Record<
  ClaudeCodeToolCallStatus,
  string
> = {
  error: "failed",
  pending: "running",
  success: "succeeded",
};
