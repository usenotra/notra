import type {
  ChangeEventHandler,
  ComponentProps,
  KeyboardEventHandler,
  ReactNode,
  Ref,
} from "react";

import type { Card } from "@/components/ui/card";
import type { Collapsible } from "@/components/ui/collapsible";

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

export interface ClaudeCodeModeConfig {
  className: string;
  /** Whether the status line shows the shift+tab hint. */
  cycles: boolean;
  label: string;
}

export interface ClaudeCodeEffortConfig {
  className: string;
  glyph: string;
}

export interface ClaudeCodeTodoConfig {
  glyph: string;
  labelClassName: string;
  srLabel: string;
}

export interface ClaudeCodeToolCallConfig {
  className: string;
  srLabel: string;
}

export interface ClaudeCodeTodo {
  label: string;
  status: ClaudeCodeTodoStatus;
}

export interface ClaudeCodePullRequest {
  href?: string;
  number: number;
}

export interface ClaudeCodeTerminalProps extends Omit<
  ComponentProps<typeof Card>,
  "title"
> {
  contentClassName?: string;
  /** Pinned under the scrolling transcript, like Claude Code's prompt. */
  footer?: ReactNode;
  title?: ReactNode;
}

export interface ClaudeCodeLogoProps extends ComponentProps<"svg"> {
  size?: number;
}

export interface ClaudeCodeHeaderProps extends ComponentProps<"div"> {
  cwd?: string;
  model?: string;
  org?: string;
  /** Dim `⎿` lines under the notices, like hook output or tips. */
  tips?: string[];
  version?: string;
  /** Notice lines printed under the header. Supports `code` and **bold**. */
  whatsNew?: string[];
}

export interface ClaudeCodeMessageProps extends ComponentProps<"div"> {
  from?: "user" | "assistant";
}

export interface ClaudeCodeThinkingProps extends Omit<
  ComponentProps<typeof Collapsible>,
  "children"
> {
  children?: ReactNode;
  label?: ReactNode;
}

export interface ClaudeCodeSpinnerProps extends ComponentProps<"div"> {
  /** Extra fields in the parentheses, like `thinking`. */
  details?: string[];
  elapsed?: string;
  /** Freeze the glyph, for screenshots and reduced motion. */
  paused?: boolean;
  tip?: string;
  tokens?: number;
  verb?: string;
}

export interface ClaudeCodeTurnSummaryProps extends ComponentProps<"div"> {
  doneAt?: string;
  duration: string;
  verb?: string;
}

export interface ClaudeCodeTodoListProps extends ComponentProps<"div"> {
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

export interface ClaudeCodeToolSummaryProps extends Omit<
  ComponentProps<typeof Collapsible>,
  "children"
> {
  children?: ReactNode;
  count: number;
  noun?: string;
  verb?: string;
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
  onKeyDown?: KeyboardEventHandler<HTMLInputElement>;
  placeholder?: string;
  pullRequest?: ClaudeCodePullRequest;
  value?: string;
}

export interface ClaudeCodeSessionHeader {
  cwd: string;
  model: string;
  org: string;
  tips: string[];
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

export interface ClaudeCodeSessionSpinner {
  details: string[];
  elapsed: string;
  tip: string;
  tokens: number;
  verb: string;
}

export interface ClaudeCodeSessionTurn {
  answer: string;
  commands: ClaudeCodeSessionToolCall[];
  id: string;
  prompt: string;
  summary: { doneAt: string; duration: string; verb: string };
  thinking?: string;
}

export interface ClaudeCodeSessionPendingTurn {
  prompt: string;
  spinner: ClaudeCodeSessionSpinner;
  todos: ClaudeCodeTodo[];
  toolCall: ClaudeCodeSessionToolCall;
}

export interface ClaudeCodeSession {
  header: ClaudeCodeSessionHeader;
  pending: ClaudeCodeSessionPendingTurn;
  promptPlaceholder: string;
  pullRequest: ClaudeCodePullRequest;
  title: string;
  turns: ClaudeCodeSessionTurn[];
}
