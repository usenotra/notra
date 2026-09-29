import type { ComponentProps, ReactNode } from "react";

import type { Collapsible } from "@/components/ui/collapsible";

export type ClaudeModelId =
  | "fable-5.1"
  | "sonnet-5.5"
  | "opus-5.5"
  | "opus-5"
  | "fable-5"
  | "sonnet-5"
  | "haiku-4.5"
  | "opus-4.8"
  | "opus-4.7"
  | "opus-4.6"
  | "opus-3"
  | "sonnet-4.6";

export type ClaudeEffortId = "low" | "medium" | "high" | "extra" | "max";

export interface ClaudeModelOption {
  description: string;
  group: "latest" | "previous";
  id: ClaudeModelId;
  label: string;
}

export interface ClaudeEffortOption {
  badge?: string;
  id: ClaudeEffortId;
  info?: string;
  label: string;
}

export type ClaudeMessageRole = "user" | "assistant";

export interface ClaudeSearchResult {
  domain: string;
  title: string;
}

export interface ClaudeSearchGroup {
  count: number;
  query: string;
  results: ClaudeSearchResult[];
}

export interface ClaudeStepThought {
  text: ReactNode;
  type: "thought";
}

export interface ClaudeStepTool {
  code?: string;
  content?: ReactNode;
  count?: number;
  detail?: ReactNode;
  label: ReactNode;
  results?: ClaudeSearchResult[];
  tool?: string;
  type: "tool";
}

export type ClaudeStepItem = ClaudeStepThought | ClaudeStepTool;

export type ClaudeSearchStepIcon = "clock" | "check" | "error";

export interface ClaudeSearchStep {
  icon: ClaudeSearchStepIcon;
  label: string;
}

export interface ClaudeSourceItem {
  domain: string;
  favicon?: string;
  href: string;
  title: string;
}

export interface ClaudeSpinnerFrame {
  inner: number;
  jitter?: number;
  outer: number;
  rays: number;
  strokeWidth: number;
}

export interface ClaudeSpinnerProps extends ComponentProps<"span"> {
  animated?: boolean;
  reducedMotion?: boolean;
  size?: number;
}

export interface ClaudeThinkingProps extends ComponentProps<"div"> {
  intervalMs?: number;
  reducedMotion?: boolean;
  verbs?: readonly string[];
}

export interface ClaudeSearchProps extends Omit<
  ComponentProps<typeof Collapsible>,
  "children"
> {
  groups?: readonly ClaudeSearchGroup[];
  items?: readonly ClaudeStepItem[];
  queryLabel?: ReactNode;
  reducedMotion?: boolean;
  resultsLabel?: (count: number) => ReactNode;
  sequential?: boolean;
  steps?: readonly ClaudeSearchStep[];
  summary?: ReactNode;
  thought?: ReactNode;
  verb?: ReactNode;
}

export interface ClaudeSourcesProps extends ComponentProps<"div"> {
  label?: ReactNode;
  sources: readonly ClaudeSourceItem[];
}

export interface ClaudeSourceLinkProps extends Omit<
  ComponentProps<"a">,
  "href"
> {
  source: ClaudeSourceItem;
}

export interface ClaudeMessageProps extends ComponentProps<"div"> {
  actions?: ReactNode;
  from: ClaudeMessageRole;
  search?: ReactNode;
  sources?: ReactNode;
}

export interface ClaudeActionsProps extends ComponentProps<"div"> {
  from?: ClaudeMessageRole;
  onBadResponse?: () => void;
  onEdit?: () => void;
  onGoodResponse?: () => void;
  onReadAloud?: () => void;
  onRetry?: () => void;
  text: string;
  timestamp?: ReactNode;
}

export interface ClaudeActionButtonProps {
  children: ReactNode;
  label: string;
  onClick?: () => void;
}

export interface ClaudeModelSelectorProps {
  className?: string;
  effort: ClaudeEffortId;
  effortLabel?: ReactNode;
  model: ClaudeModelId;
  moreModelsLabel?: ReactNode;
  onEffortChange?: (effort: ClaudeEffortId) => void;
  onModelChange?: (model: ClaudeModelId) => void;
}

export interface ClaudeComposerProps extends Omit<
  ComponentProps<"div">,
  "onSubmit"
> {
  busy?: boolean;
  defaultEffort?: ClaudeEffortId;
  defaultModel?: ClaudeModelId;
  disclaimer?: ReactNode;
  effort?: ClaudeEffortId;
  model?: ClaudeModelId;
  onEffortChange?: (effort: ClaudeEffortId) => void;
  onModelChange?: (model: ClaudeModelId) => void;
  contextUsage?: number;
  mode?: ReactNode;
  onModeClick?: () => void;
  onPlusSelect?: (item: ClaudePlusMenuItemId) => void;
  onSend?: (text: string) => void;
  onStop?: () => void;
  placeholder?: string;
}

export type ClaudePlusMenuItemId =
  | "add-files"
  | "add-plugins"
  | "research"
  | `skill:${string}`
  | `connector:${string}`
  | `design-system:${string}`;

export interface ClaudePlusMenuProps {
  className?: string;
  onSelect?: (item: ClaudePlusMenuItemId) => void;
}

export interface ClaudeUsageRingProps extends ComponentProps<"div"> {
  label?: string;
  size?: number;
  value: number;
}

export interface ClaudeDemoSearch {
  groups: ClaudeSearchGroup[];
  items?: ClaudeStepItem[];
  steps?: ClaudeSearchStep[];
  summary?: string;
  thought?: string;
  verb: string;
}

export interface ClaudeDemoMessage {
  from: ClaudeMessageRole;
  id: string;
  search?: ClaudeDemoSearch;
  sources?: ClaudeSourceItem[];
  text: string;
}

export interface ClaudeTextSegment {
  offset: number;
  text: string;
}
