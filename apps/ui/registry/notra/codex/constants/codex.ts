import type { CodexExecStatus } from "../types/codex";

export const CODEX_DEFAULT_VERSION = "0.159.2";

export const CODEX_DEFAULT_MODEL = "gpt-6.1-codex";

export const CODEX_DEFAULT_CWD = "~/acme/web";

export const CODEX_DEFAULT_PLACEHOLDER = "Ask Codex to do anything";

export const CODEX_DEFAULT_GREETING = "Anything interesting on the docket?";

export const CODEX_EXEC_PREVIEW_LINES = 3;

export const CODEX_SHIMMER_MS = 2000;

export const CODEX_BULLET_BLINK_MS = 1200;

export const CODEX_EXEC_STATUS_LABEL: Record<CodexExecStatus, string> = {
  failed: "Ran",
  ran: "Ran",
  running: "Running",
};

export const CODEX_EXEC_STATUS_CLASS: Record<CodexExecStatus, string> = {
  failed: "text-codex-red",
  ran: "text-codex-success",
  running: "text-codex-muted animate-pulse motion-reduce:animate-none",
};

export const CODEX_SHELL_TOKEN_CLASS = {
  argument: "text-codex-arg",
  command: "text-codex-command",
  flag: "text-codex-flag",
  operator: "text-codex-operator",
  space: "",
  string: "text-codex-green",
} as const;

export const CODEX_ROW_CLASS =
  "grid grid-cols-[2ch_minmax(0,1fr)] px-[1ch] font-codex text-[0.8125rem] leading-[1.3]";
