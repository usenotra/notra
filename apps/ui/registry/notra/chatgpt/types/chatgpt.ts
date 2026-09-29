import type { ComponentProps, ReactNode } from "react";

import type { Avatar } from "@/components/ui/avatar";
import type { Button } from "@/components/ui/button";
import type { Collapsible } from "@/components/ui/collapsible";
import type { Sheet } from "@/components/ui/sheet";

export type ChatgptModelId =
  | "latest"
  | "sol"
  | "terra"
  | "luna"
  | "gpt-5.5"
  | "gpt-5.4"
  | "gpt-5.4-mini";

export type ChatgptEffortId =
  | "instant"
  | "medium"
  | "high"
  | "extra-high"
  | "pro";

export type ChatgptMessageRole = "user" | "assistant";

export interface ChatgptModelOption {
  description?: string;
  id: ChatgptModelId;
  label: string;
  shortLabel: string;
}

export interface ChatgptEffortOption {
  id: ChatgptEffortId;
  label: string;
}

export interface ChatgptActivitySite {
  domain: string;
  favicon?: string;
  label: string;
}

export interface ChatgptActivitySource {
  domain: string;
  favicon?: string;
  href?: string;
  id: string;
  publisher: string;
  snippet: string;
  timeLabel: string;
  title: string;
}

export interface ChatgptThreadProps extends ComponentProps<"div"> {
  autoScroll?: boolean;
  footer?: ReactNode;
}

export interface ChatgptMessageProps extends ComponentProps<"div"> {
  actions?: ReactNode;
  from: ChatgptMessageRole;
  reasoning?: ReactNode;
}

export interface ChatgptReasoningProps extends Omit<
  ComponentProps<typeof Collapsible>,
  "children"
> {
  children?: ReactNode;
  complete?: boolean;
  search?: ReactNode;
  seconds: number;
}

export interface ChatgptSearchProps extends Omit<
  ComponentProps<typeof Button>,
  "children"
> {
  sites?: readonly ChatgptActivitySite[];
  websites: number;
}

export interface ChatgptActivityProps extends Omit<
  ComponentProps<typeof Sheet>,
  "children"
> {
  className?: string;
  seconds: number;
  sites: readonly ChatgptActivitySite[];
  sourceCount?: number;
  sources: readonly ChatgptActivitySource[];
  websites: number;
}

export interface ChatgptFaviconProps extends Omit<
  ComponentProps<typeof Avatar>,
  "children"
> {
  domain: string;
  src?: string;
}

export interface ChatgptThinkingProps extends ComponentProps<"div"> {
  label?: ReactNode;
}

export interface ChatgptActionsProps extends ComponentProps<"div"> {
  onMore?: () => void;
  onRedo?: () => void;
  onShare?: () => void;
  text: string;
}

export interface ChatgptActionButtonProps extends ComponentProps<
  typeof Button
> {
  label: string;
}

export interface ChatgptModelSelectorProps extends Omit<
  ComponentProps<typeof Button>,
  "children"
> {
  effort: ChatgptEffortId;
  efforts?: readonly ChatgptEffortOption[];
  model: ChatgptModelId;
  models?: readonly ChatgptModelOption[];
  onEffortChange?: (effort: ChatgptEffortId) => void;
  onModelChange?: (model: ChatgptModelId) => void;
}

export interface ChatgptComposerProps extends Omit<
  ComponentProps<"form">,
  "onSubmit"
> {
  busy?: boolean;
  defaultEffort?: ChatgptEffortId;
  defaultModel?: ChatgptModelId;
  effort?: ChatgptEffortId;
  efforts?: readonly ChatgptEffortOption[];
  model?: ChatgptModelId;
  models?: readonly ChatgptModelOption[];
  onEffortChange?: (effort: ChatgptEffortId) => void;
  onModelChange?: (model: ChatgptModelId) => void;
  onSend?: (text: string) => void;
  onStop?: () => void;
  placeholder?: string;
}

export interface ChatgptStorySearch {
  sites: readonly ChatgptActivitySite[];
  sourceCount?: number;
  sources: readonly ChatgptActivitySource[];
  websites: number;
}

export type ChatgptStoryReasoningStep =
  | { kind: "search"; search: ChatgptStorySearch }
  | { kind: "text"; muted?: boolean; text: string };

export interface ChatgptStoryReasoning {
  search?: ChatgptStorySearch;
  seconds: number;
  steps?: readonly ChatgptStoryReasoningStep[];
  text: string;
}

export interface ChatgptStoryMessage {
  from: ChatgptMessageRole;
  id: string;
  reasoning?: ChatgptStoryReasoning;
  text: string;
}

export interface ChatgptPlayback {
  completeIds: ReadonlySet<string>;
  messages: ChatgptStoryMessage[];
  play: () => Promise<void>;
  playing: boolean;
  send: (text: string, reply: string) => Promise<void>;
  stop: () => void;
  thinking: boolean;
}

export interface ChatgptTextSegment {
  offset: number;
  text: string;
}

export interface ChatgptSourceChipProps extends Omit<
  ComponentProps<"a">,
  "children" | "href"
> {
  sources: readonly ChatgptActivitySource[];
}
