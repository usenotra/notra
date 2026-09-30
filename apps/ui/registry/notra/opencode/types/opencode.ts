import type { ScrollArea as ScrollAreaPrimitive } from "@base-ui/react/scroll-area";
import type { ComponentProps, ReactNode } from "react";

import type { Collapsible } from "@/components/ui/collapsible";

export type OpencodeActivityKind = "thought" | "read" | "search" | "tool";

export type OpencodeMessageAuthor = "user" | "assistant";

export type OpencodeMcpStatus = "Connected" | "Disconnected" | "Failed";

export type OpencodeWindowProps = ComponentProps<"div">;

export type OpencodeScrollAreaProps = ScrollAreaPrimitive.Root.Props;

export interface OpencodeLogoProps extends Omit<
  ComponentProps<"svg">,
  "height" | "width"
> {
  /** Multiplies the 234 by 42 base size. */
  scale?: number;
}

export interface OpencodeMessageProps extends ComponentProps<"div"> {
  /** Rendered under an assistant reply. */
  actions?: ReactNode;
  from?: OpencodeMessageAuthor;
  /** Rendered above an assistant reply, usually `OpencodeSources`. */
  search?: ReactNode;
}

export interface OpencodeTurnFooterProps extends ComponentProps<"div"> {
  agent?: string;
  /** Wall time of the turn. Omit it while the turn is still running. */
  duration?: string;
  model?: string;
}

export interface OpencodeActivityProps extends ComponentProps<
  typeof Collapsible
> {
  /** Arguments after the label, like a path or a query. */
  detail?: string;
  /** Shown after a dot, like `1.4s`. */
  duration?: string;
  kind?: OpencodeActivityKind;
  /** Defaults to `Thought`, `Read` or `Web Search` by kind. */
  label?: string;
  /** Renders a running thought as an animated `Thinking` line. */
  pending?: boolean;
  /** Freezes the thinking spinner. Defaults to the user's preference. */
  reducedMotion?: boolean;
}

export interface OpencodeProgressProps extends ComponentProps<"span"> {
  /** Animates the scanner. When false every cell rests as a dot. */
  active?: boolean;
  /** Freezes the scanner. Defaults to the user's preference. */
  reducedMotion?: boolean;
}

export interface OpencodeComposerProps extends Omit<
  ComponentProps<"input">,
  "children" | "className" | "type"
> {
  agent?: string;
  /** Shows the scanner and `esc interrupt` instead of the cwd. */
  busy?: boolean;
  className?: string;
  /** Context usage on the status row, like `63.4K (6%)`. */
  context?: string;
  /** Working directory shown on the status row while idle. */
  cwd?: string;
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
  /** Git branch appended to the cwd. Its last segment is highlighted. */
  branch?: string;
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

export interface OpencodeSourcesProps extends Omit<
  ComponentProps<typeof Collapsible>,
  "children"
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
  label?: string;
}

/** A run of reply text: plain, `code` (green) or strong (orange). */
export type OpencodeDemoSpan = string | { code: string } | { strong: string };

export interface OpencodeDemoListItem {
  id: string;
  spans: OpencodeDemoSpan[];
}

export type OpencodeDemoBlock =
  | { heading: string; id: string }
  | { id: string; items: OpencodeDemoListItem[] }
  | { id: string; text: OpencodeDemoSpan[] };

export interface OpencodeDemoTurn {
  activities: OpencodeDemoActivity[];
  duration?: string;
  id: string;
  prompt: string;
  reply: OpencodeDemoBlock[];
}

export interface OpencodeDemoSession {
  agent: string;
  branch: string;
  context: string;
  cwd: string;
  effort: string;
  model: string;
  provider: string;
  servers: OpencodeMcpServer[];
  spent: string;
  title: string;
  tokens: string;
  used: string;
  version: string;
}
