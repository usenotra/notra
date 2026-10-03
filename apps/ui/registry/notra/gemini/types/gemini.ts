import type { ComponentProps, ReactNode } from "react";

import type { Button } from "@/components/ui/button";
import type { Collapsible } from "@/components/ui/collapsible";

export type GeminiModelId = "flash-lite" | "flash" | "pro" | "thinking";

export type GeminiModelGroup = "core" | "thinking";

export interface GeminiModelOption {
  badge?: string;
  chip: string;
  description: string;
  group: GeminiModelGroup;
  id: GeminiModelId;
  label: string;
}

export type GeminiMessageRole = "user" | "assistant";

export interface GeminiMessageProps extends ComponentProps<"div"> {
  actions?: ReactNode;
  from: GeminiMessageRole;
  status?: ReactNode;
  thoughts?: ReactNode;
}

export interface GeminiActionButtonProps extends ComponentProps<typeof Button> {
  label: string;
}

export interface GeminiActionsProps extends ComponentProps<"div"> {
  onBadResponse?: () => void;
  onGoodResponse?: () => void;
}

export interface GeminiSparkleProps extends ComponentProps<"span"> {
  animated?: boolean;
  reducedMotion?: boolean;
  size?: number;
}

export interface GeminiThinkingProps extends ComponentProps<"div"> {
  label?: ReactNode;
  reducedMotion?: boolean;
}

export interface GeminiModelSelectorProps extends Omit<
  ComponentProps<typeof Button>,
  "defaultValue" | "onChange" | "value"
> {
  defaultModel?: GeminiModelId;
  model?: GeminiModelId;
  models?: readonly GeminiModelOption[];
  onModelChange?: (model: GeminiModelId) => void;
}

export interface GeminiComposerProps extends Omit<
  ComponentProps<"div">,
  "onSubmit"
> {
  busy?: boolean;
  defaultModel?: GeminiModelId;
  disclaimer?: ReactNode;
  model?: GeminiModelId;
  models?: readonly GeminiModelOption[];
  onModelChange?: (model: GeminiModelId) => void;
  onSend?: (text: string) => void;
  onStop?: () => void;
  placeholder?: string;
  privacyHref?: string;
  privacyLabel?: ReactNode;
}

export interface GeminiSource {
  description?: string;
  domain: string;
  favicon?: string;
  href?: string;
  id: string;
  name: string;
  title: string;
}

export type GeminiThoughtStep =
  | { kind: "search"; queries: readonly string[] }
  | { kind: "thought"; text: string };

export interface GeminiSourceChipProps extends Omit<
  ComponentProps<"a">,
  "children" | "href"
> {
  source: GeminiSource;
}

export interface GeminiThoughtsProps extends Omit<
  ComponentProps<typeof Collapsible>,
  "children"
> {
  hideLabel?: ReactNode;
  showLabel?: ReactNode;
  steps: readonly GeminiThoughtStep[];
}

export interface GeminiStoryTextProps extends Omit<
  ComponentProps<"div">,
  "children"
> {
  sources?: readonly GeminiSource[];
  text: string;
}

export interface GeminiStoryMessage {
  from: GeminiMessageRole;
  id: string;
  search?: boolean;
  sources?: readonly GeminiSource[];
  text: string;
  thoughts?: readonly GeminiThoughtStep[];
}

export interface GeminiTextSegment {
  offset: number;
  text: string;
}
