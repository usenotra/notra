import type * as React from "react";

export type OpencodeActivityKind = "thought" | "tool";

export interface OpencodeActivityProps {
  kind?: OpencodeActivityKind;
  label: string;
  detail?: string;
  duration?: string;
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
  context?: string;
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

export type OpencodeMcpStatus = "Connected" | "Disconnected" | "Error";

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
  cwd?: string;
  version?: string;
  className?: string;
}

export interface OpencodeSource {
  title: string;
  domain: string;
  url?: string;
}

export interface OpencodeSourcesProps {
  darkSurface?: boolean;
  sources: readonly OpencodeSource[];
  queries?: readonly string[];
  sequential?: boolean;
  reducedMotion?: boolean;
  className?: string;
}
