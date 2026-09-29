import type { ComponentProps, ReactNode } from "react";

import type { Collapsible } from "@/components/ui/collapsible";

export type OpencodeActivityKind = "thought" | "tool";

export type OpencodeMessageAuthor = "user" | "assistant";

export type OpencodeMcpStatus = "Connected" | "Disconnected" | "Error";

export type OpencodeWindowProps = ComponentProps<"div">;

export interface OpencodeLogoProps extends Omit<
  ComponentProps<"svg">,
  "height" | "width"
> {
  scale?: number;
}

export interface OpencodeActivityProps extends ComponentProps<
  typeof Collapsible
> {
  detail?: string;
  duration?: string;
  kind?: OpencodeActivityKind;
  label: string;
}

export interface OpencodeMessageProps extends ComponentProps<"div"> {
  actions?: ReactNode;
  from?: OpencodeMessageAuthor;
  search?: ReactNode;
}

export interface OpencodeComposerProps extends Omit<
  ComponentProps<"input">,
  "className" | "type"
> {
  agent?: string;
  className?: string;
  context?: string;
  effort?: string;
  inputClassName?: string;
  model?: string;
  provider?: string;
}

export interface OpencodeMcpServer {
  name: string;
  status?: OpencodeMcpStatus;
}

export interface OpencodeSidebarProps extends Omit<
  ComponentProps<"aside">,
  "title"
> {
  cwd?: string;
  lsp?: ReactNode;
  mcpOpen?: ComponentProps<typeof Collapsible>["open"];
  onMcpOpenChange?: ComponentProps<typeof Collapsible>["onOpenChange"];
  servers?: OpencodeMcpServer[];
  spent?: string;
  title?: ReactNode;
  tokens?: string;
  used?: string;
  version?: string;
}

export interface OpencodeSource {
  domain: string;
  title: string;
  url?: string;
}

export interface OpencodeSourcesLabels {
  citedSources: (count: number) => string;
  openSource: (title: string, domain: string) => string;
}

export interface OpencodeSourcesProps extends ComponentProps<
  typeof Collapsible
> {
  labels?: OpencodeSourcesLabels;
  queries?: readonly string[];
  reducedMotion?: boolean;
  sequential?: boolean;
  sources: readonly OpencodeSource[];
}

export interface OpencodeDemoActivity {
  body?: string;
  detail?: string;
  duration?: string;
  id: string;
  kind: OpencodeActivityKind;
  label: string;
}

export interface OpencodeDemoSession {
  activities: OpencodeDemoActivity[];
  assistantMessage: string;
  context: string;
  cwd: string;
  promptPlaceholder: string;
  resultMessage: string;
  servers: OpencodeMcpServer[];
  title: string;
  tokens: string;
  used: string;
  userMessage: string;
  version: string;
}
