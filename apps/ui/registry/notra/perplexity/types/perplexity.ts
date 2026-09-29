import type { ComponentProps, ReactNode } from "react";

import type { Avatar } from "@/components/ui/avatar";
import type { Collapsible } from "@/components/ui/collapsible";

export type PerplexityMessageRole = "user" | "assistant";

export type PerplexityModelProvider =
  | "perplexity"
  | "openai"
  | "google"
  | "anthropic"
  | "kimi"
  | "zhipu"
  | "xai"
  | "nvidia";

export type PerplexityModelBadge = "max" | "new";

export interface PerplexityModel {
  badge?: PerplexityModelBadge;
  id: string;
  label: string;
  locked?: boolean;
  provider: PerplexityModelProvider;
}

export type PerplexityFocusId = "search" | "research";

export type PerplexityRewriteModeId = "deep-research" | "learn" | "search";

export interface PerplexityRewriteMode {
  id: PerplexityRewriteModeId;
  label: string;
  locked?: boolean;
}

export interface PerplexityRewriteOptions {
  mode: PerplexityRewriteModeId;
  model?: string;
}

export interface PerplexityRewritePanelProps extends Omit<
  ComponentProps<"div">,
  "onSubmit"
> {
  defaultMode?: PerplexityRewriteModeId;
  modes?: readonly PerplexityRewriteMode[];
  models?: readonly PerplexityModel[];
  onClose?: () => void;
  onRewrite?: (options: PerplexityRewriteOptions) => void;
  promoLabel?: ReactNode;
}

export interface PerplexityFocusOption {
  description: string;
  id: PerplexityFocusId;
  label: string;
}

export interface PerplexitySource {
  domain: string;
  title: string;
  url?: string;
  verified?: boolean;
}

export interface PerplexitySearchLabels {
  more: (count: number) => string;
  showLess: string;
}

export interface PerplexityMessageProps extends ComponentProps<"div"> {
  actions?: ReactNode;
  from: PerplexityMessageRole;
  search?: ReactNode;
}

export interface PerplexitySearchProps extends Omit<
  ComponentProps<typeof Collapsible>,
  "title"
> {
  duration?: ReactNode;
  emptyDescription?: ReactNode;
  extraCount?: number;
  label?: ReactNode;
  labels?: PerplexitySearchLabels;
  onStepOpenChange?: (open: boolean) => void;
  previewCount?: number;
  queries: readonly string[];
  reducedMotion?: boolean;
  runningLabel?: ReactNode;
  sequential?: boolean;
  sources: readonly PerplexitySource[];
  stepDefaultOpen?: boolean;
  stepOpen?: boolean;
  title?: ReactNode;
}

export interface PerplexityCitationSource {
  description?: string;
  domain: string;
  title: string;
  url?: string;
}

export interface PerplexityCitationProps extends ComponentProps<"span"> {
  extra?: number;
  label: string;
  sources?: readonly PerplexityCitationSource[];
}

export interface PerplexityFaviconProps extends ComponentProps<typeof Avatar> {
  domain: string;
}

export interface PerplexityActionsProps extends Omit<
  ComponentProps<"div">,
  "onSubmit"
> {
  models?: readonly PerplexityModel[];
  onBadResponse?: () => void;
  onDownload?: () => void;
  onGoodResponse?: () => void;
  onMore?: () => void;
  onRewrite?: (options: PerplexityRewriteOptions) => void;
  onShare?: () => void;
  sources?: readonly PerplexitySource[];
  text: string;
}

export interface PerplexityUserActionsProps extends ComponentProps<"div"> {
  onEdit?: () => void;
  text: string;
  timestamp?: ReactNode;
}

export interface PerplexitySourcesSummaryProps extends ComponentProps<"div"> {
  sources: readonly PerplexitySource[];
}

export interface PerplexityComposerProps extends Omit<
  ComponentProps<"form">,
  "onSubmit"
> {
  busy?: boolean;
  defaultModel?: string;
  focus?: PerplexityFocusId;
  focusOptions?: readonly PerplexityFocusOption[];
  model?: string;
  models?: readonly PerplexityModel[];
  onModelChange?: (model: string) => void;
  onSend?: (text: string) => void;
  onStop?: () => void;
  placeholder?: string;
}

export interface PerplexityModelSelectorProps extends ComponentProps<"button"> {
  label?: ReactNode;
  model?: string;
  models?: readonly PerplexityModel[];
  onModelChange?: (model: string) => void;
  promoLabel?: ReactNode;
}

export interface PerplexityModelIconProps extends ComponentProps<"span"> {
  provider: PerplexityModelProvider;
}

export interface PerplexityThinkingProps extends ComponentProps<"div"> {
  label?: ReactNode;
  reducedMotion?: boolean;
}

export interface PerplexityThreadCitation {
  domain: string;
  extra?: number;
  id: string;
  label: string;
  sources?: readonly PerplexityCitationSource[];
}

export interface PerplexityThreadSearch {
  duration?: string;
  extraCount?: number;
  previewCount?: number;
  queries: string[];
  sources: PerplexitySource[];
  title?: string;
}

export interface PerplexityThreadMessage {
  citations?: readonly PerplexityThreadCitation[];
  from: PerplexityMessageRole;
  id: string;
  search?: PerplexityThreadSearch;
  text: string;
}

export interface PerplexityAnswerProps extends ComponentProps<"div"> {
  citations?: readonly PerplexityThreadCitation[];
  text: string;
}
