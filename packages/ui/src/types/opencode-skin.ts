import type * as React from "react";

export type OpencodeActivityKind = "thought" | "read" | "search" | "tool";

export interface OpencodeActivityProps {
  kind?: OpencodeActivityKind;
  /** Defaults to `Thought`, `Read` or `Web Search` by kind. */
  label?: string;
  /** Arguments after the label, like a path or a query. */
  detail?: string;
  /** Shown after a dot, like `1.4s`. */
  duration?: string;
  /** Renders a running thought as an animated `Thinking` line. */
  pending?: boolean;
  reducedMotion?: boolean;
  className?: string;
}

export interface OpencodeProgressProps {
  active?: boolean;
  reducedMotion?: boolean;
  className?: string;
}

export interface OpencodeComposerProps {
  value?: string;
  defaultValue?: string;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
  placeholder?: string;
  agent?: string;
  model?: string;
  provider?: string;
  effort?: string;
  /** Context usage on the status row, like `63.4K (6%)`. */
  context?: string;
  /** Shows the scanner and `esc interrupt` instead of the cwd. */
  busy?: boolean;
  /** Working directory shown on the status row while idle. */
  cwd?: string;
  className?: string;
  inputClassName?: string;
  ref?: React.Ref<HTMLInputElement>;
}

export interface OpencodeLogoProps {
  className?: string;
  scale?: number;
}

export interface OpencodeMessageProps {
  from?: "user" | "assistant";
  search?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

export interface OpencodeTurnFooterProps {
  agent?: string;
  model?: string;
  duration?: string;
  className?: string;
}

export type OpencodeMcpStatus = "Connected" | "Disconnected" | "Failed";

export interface OpencodeMcpServer {
  name: string;
  status?: OpencodeMcpStatus;
}

export interface OpencodeSidebarProps {
  title?: string;
  tokens?: string;
  used?: string;
  spent?: string;
  servers?: OpencodeMcpServer[];
  lsp?: string;
  cwd?: string;
  /** Git branch appended to the cwd. Its last segment is highlighted. */
  branch?: string;
  version?: string;
  className?: string;
}

export interface OpencodeSource {
  title: string;
  domain: string;
  url?: string;
}

export interface OpencodeSourcesLabels {
  citedSources: (count: number) => string;
  openSource: (title: string, domain: string) => string;
}

export interface OpencodeSourcesProps {
  labels?: OpencodeSourcesLabels;
  /**
   * Set when the lines sit on another terminal skin (Claude Code, Codex).
   * Drops the OpenCode indent so they align with that skin's text.
   */
  darkSurface?: boolean;
  sources: readonly OpencodeSource[];
  queries?: readonly string[];
  sequential?: boolean;
  reducedMotion?: boolean;
  className?: string;
}
