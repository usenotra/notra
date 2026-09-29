import type {
  ChangeEventHandler,
  ComponentProps,
  KeyboardEventHandler,
  ReactNode,
  Ref,
} from "react";

import type { Card } from "@/components/ui/card";
import type { Collapsible } from "@/components/ui/collapsible";
import type { ItemGroup } from "@/components/ui/item";

export type ClaudeCodeMode =
  | "auto"
  | "manual"
  | "accept-edits"
  | "plan"
  | "bypass";

export type ClaudeCodeEffort =
  | "low"
  | "medium"
  | "high"
  | "xhigh"
  | "max"
  | "ultracode";

export type ClaudeCodeTodoStatus = "done" | "active" | "todo";

export type ClaudeCodeToolCallStatus = "success" | "error" | "pending";

export interface ClaudeCodeKeyHint {
  keys: string;
  label: string;
  parenthesized?: boolean;
}

export interface ClaudeCodeModeConfig {
  className: string;
  glyph: string;
  hints: ClaudeCodeKeyHint[];
  label: string;
  leadingDot?: boolean;
}

export interface ClaudeCodeEffortConfig {
  glyph: string;
  label: string;
  rainbow?: boolean;
}

export interface ClaudeCodeTodo {
  label: string;
  status: ClaudeCodeTodoStatus;
}

export interface ClaudeCodeTerminalProps extends Omit<
  ComponentProps<typeof Card>,
  "title"
> {
  contentClassName?: string;
  title?: ReactNode;
}

export interface ClaudeCodeLogoProps extends ComponentProps<"svg"> {
  scale?: number;
}

export interface ClaudeCodeHeaderProps extends Omit<
  ComponentProps<typeof Card>,
  "title"
> {
  variant?: "full" | "compact";
  cwd?: string;
  model?: string;
  org?: string;
  tips?: string[];
  title?: ReactNode;
  user?: string;
  version?: string;
  whatsNew?: string[];
}

export interface ClaudeCodeMessageProps extends ComponentProps<"div"> {
  from?: "user" | "assistant";
}

export interface ClaudeCodePullRequest {
  href?: string;
  number: number;
}

export interface ClaudeCodePromptProps extends Omit<
  ComponentProps<"div">,
  "defaultValue" | "onChange" | "onKeyDown"
> {
  defaultValue?: string;
  effort?: ClaudeCodeEffort | false;
  inputClassName?: string;
  inputRef?: Ref<HTMLInputElement>;
  mode?: ClaudeCodeMode;
  onChange?: ChangeEventHandler<HTMLInputElement>;
  pullRequest?: ClaudeCodePullRequest;
  onKeyDown?: KeyboardEventHandler<HTMLInputElement>;
  placeholder?: string;
  value?: string;
}

export interface ClaudeCodeTodoListProps extends ComponentProps<
  typeof ItemGroup
> {
  /** The tool line above the list. Pass `null` to leave it out. */
  heading?: string | null;
  todos: ClaudeCodeTodo[];
}

export interface ClaudeCodeToolCallProps extends Omit<
  ComponentProps<typeof Collapsible>,
  "children"
> {
  arg?: string;
  children?: ReactNode;
  result: ReactNode;
  status?: ClaudeCodeToolCallStatus;
  tool: string;
}

export interface ClaudeCodeThinkingProps extends Omit<
  ComponentProps<typeof Collapsible>,
  "children"
> {
  children?: ReactNode;
  label?: ReactNode;
}

export interface ClaudeCodeSessionHeader {
  cwd: string;
  model: string;
  org: string;
  tips: string[];
  user: string;
  version: string;
  whatsNew: string[];
}

export interface ClaudeCodeSessionToolCall {
  arg?: string;
  detail?: string;
  id: string;
  result: string;
  status?: ClaudeCodeToolCallStatus;
  tool: string;
}

export interface ClaudeCodeSession {
  assistantMessage: string;
  header: ClaudeCodeSessionHeader;
  promptPlaceholder: string;
  resultMessage: string;
  thinking?: string;
  title: string;
  todos: ClaudeCodeTodo[];
  toolCalls: ClaudeCodeSessionToolCall[];
  userMessage: string;
}
