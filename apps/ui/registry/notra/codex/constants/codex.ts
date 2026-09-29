import type { CodexExecStatus } from "../types/codex";

export const CODEX_DEFAULT_VERSION = "0.92.0";

export const CODEX_DEFAULT_MODEL = "gpt-6-astra";

export const CODEX_DEFAULT_CWD = "~/acme/web";

export const CODEX_DEFAULT_CONTEXT = "88% context left";

export const CODEX_DEFAULT_PLACEHOLDER = "Ask Codex to do anything";

export const CODEX_EXEC_STATUS_LABEL: Record<CodexExecStatus, string> = {
  failed: "Failed",
  ran: "Ran",
  running: "Running",
};

export const CODEX_EXEC_STATUS_CLASS: Record<CodexExecStatus, string> = {
  failed: "text-codex-red",
  ran: "text-codex-green",
  running: "text-codex-dim",
};
