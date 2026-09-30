import type { ComponentProps, ReactNode } from "react";

import type { Card } from "@/components/ui/card";
import type { Collapsible } from "@/components/ui/collapsible";

export type CodexExecStatus = "ran" | "running" | "failed";

export type CodexMessageAuthor = "user" | "assistant";

export type CodexShellTokenKind =
  | "command"
  | "flag"
  | "string"
  | "operator"
  | "argument"
  | "space";

export interface CodexShellToken {
  kind: CodexShellTokenKind;
  text: string;
}

export type CodexExploredVerb = "Read" | "Search" | "List";

export interface CodexExploredItem {
  id: string;
  scope?: string;
  target: string;
  verb: CodexExploredVerb;
}

export interface CodexTerminalProps extends Omit<
  ComponentProps<typeof Card>,
  "title"
> {
  footer?: ReactNode;
  title?: ReactNode;
}

export interface CodexHeaderProps extends ComponentProps<"div"> {
  cwd?: string;
  greeting?: ReactNode;
  version?: string;
}

export interface CodexMessageProps extends ComponentProps<"div"> {
  from?: CodexMessageAuthor;
}

export interface CodexReasoningProps extends ComponentProps<"div"> {
  children?: ReactNode;
}

export interface CodexExecProps extends Omit<
  ComponentProps<typeof Collapsible>,
  "children"
> {
  command: string;
  output?: string;
  previewLines?: number;
  status?: CodexExecStatus;
}

export interface CodexExploredProps extends Omit<
  ComponentProps<typeof Collapsible>,
  "children"
> {
  active?: boolean;
  details?: CodexExploredItem[];
  items: CodexExploredItem[];
}

export interface CodexWorkingProps extends ComponentProps<"div"> {
  elapsed?: string;
  label?: string;
}

export interface CodexInterruptedProps extends ComponentProps<"div"> {
  children?: ReactNode;
}

export interface CodexTableProps extends ComponentProps<"table"> {
  codeColumns?: number[];
  headers: string[];
  rows: ReactNode[][];
}

export interface CodexListProps extends ComponentProps<"ul"> {
  items: ReactNode[];
}

export interface CodexComposerProps extends Omit<
  ComponentProps<"input">,
  "className" | "type"
> {
  /** A turn is running: Enter does not send and Escape calls `onStop`. */
  busy?: boolean;
  className?: string;
  context?: string;
  cwd?: string;
  effort?: string;
  inputClassName?: string;
  model?: string;
  /** Called with the trimmed text on Enter. The composer clears afterwards. */
  onSend?: (text: string) => void;
  /** Called on Escape while `busy`, to interrupt the running turn. */
  onStop?: () => void;
  task?: string;
  warnings?: number;
}

export interface CodexDemoExec {
  command: string;
  id: string;
  output?: string;
  status: CodexExecStatus;
}

export interface CodexDemoHighlight {
  id: string;
  label: string;
  text: string;
}

export interface CodexDemoSession {
  composer: {
    effort: string;
    model: string;
    placeholder: string;
    task: string;
    warnings: number;
  };
  exec: {
    command: string;
    output: string;
  };
  explored: CodexExploredItem[];
  exploredDetails: CodexExploredItem[];
  followUp: string;
  header: {
    cwd: string;
    version: string;
  };
  highlights: CodexDemoHighlight[];
  intro: string;
  reasoning: string;
  summary: string;
  table: {
    headers: string[];
    rows: string[][];
  };
  tableIntro: string;
  title: string;
  userMessage: string;
}

export type CodexTurnStatus = "working" | "streaming" | "done" | "interrupted";

/** A scripted answer the demo plays back when you send a prompt. */
export interface CodexReply {
  /** Commands Codex runs before it answers, with their final status. */
  execs: CodexDemoExec[];
  /** The answer. Blank lines split paragraphs, backticks mark code. */
  text: string;
}

export interface CodexChatTurn {
  execs: CodexDemoExec[];
  id: string;
  prompt: string;
  reply: string;
  status: CodexTurnStatus;
}

export interface CodexChat {
  busy: boolean;
  /** Whole seconds since the running turn started. */
  elapsed: number;
  send: (text: string) => Promise<void>;
  stop: () => void;
  turns: CodexChatTurn[];
}
