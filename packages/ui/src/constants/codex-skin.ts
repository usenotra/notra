import type { CodexExecStatus } from "@notra/ui/types/codex-skin";

/** Colors sampled from the Codex CLI TUI. */
export const CODEX_COLORS = {
  background: "#0f0f0f",
  foreground: "#f7f7f7",
  dim: "#909090",
  muted: "#777777",
  rule: "#343434",
  band: "#2d2d2d",
  composer: "#252525",
  placeholder: "#868686",
  cursor: "#fc0076",
  blue: "#3c9ffc",
  command: "#70abfa",
  argument: "#c3cff4",
  operator: "#6cdfcd",
  flag: "#f3909f",
  green: "#85df8d",
  success: "#00a12e",
  yellow: "#fcdb9b",
  amber: "#be9952",
  red: "#ff6b6b",
} as const;

export const CODEX_DEFAULT_VERSION = "0.159.2";
export const CODEX_DEFAULT_CWD = "~/acme/web";
export const CODEX_DEFAULT_MODEL = "gpt-6.1-codex";
export const CODEX_DEFAULT_PLACEHOLDER = "Ask Codex to do anything";
export const CODEX_DEFAULT_GREETING = "Anything interesting on the docket?";

/** Output lines shown before the "+ N lines" fold. */
export const CODEX_EXEC_PREVIEW_LINES = 3;

export const CODEX_EXEC_LABEL: Record<CodexExecStatus, string> = {
  ran: "Ran",
  running: "Running",
  failed: "Ran",
};

export const CODEX_EXEC_BULLET_COLOR: Record<CodexExecStatus, string> = {
  ran: CODEX_COLORS.success,
  running: CODEX_COLORS.muted,
  failed: CODEX_COLORS.red,
};

/** One sweep of the shimmer across the "Working" label. */
export const CODEX_SHIMMER_MS = 2000;
/** Blink cadence of the working bullet. */
export const CODEX_BULLET_BLINK_MS = 1200;

/** Two-column row: 2ch gutter for the bullet, then the content. */
export const CODEX_ROW_CLASS =
  "grid grid-cols-[2ch_minmax(0,1fr)] px-[1ch] font-mono text-[13px] leading-[1.3]";
