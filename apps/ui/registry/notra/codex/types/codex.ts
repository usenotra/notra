import type { ComponentProps, ReactNode } from "react";

import type { Collapsible } from "@/components/ui/collapsible";

export type CodexExecStatus = "ran" | "running" | "failed";

export type CodexMessageAuthor = "user" | "assistant";

export interface CodexTerminalProps extends Omit<
  ComponentProps<"div">,
  "title"
> {
  title?: ReactNode;
}

export interface CodexHeaderProps extends ComponentProps<"div"> {
  cwd?: string;
  model?: string;
  version?: string;
}

export interface CodexMessageProps extends ComponentProps<"div"> {
  from?: CodexMessageAuthor;
}

export interface CodexExecProps extends Omit<
  ComponentProps<typeof Collapsible>,
  "children"
> {
  command: string;
  output?: string;
  status?: CodexExecStatus;
}

export interface CodexReasoningProps extends Omit<
  ComponentProps<typeof Collapsible>,
  "children"
> {
  children?: ReactNode;
  label?: ReactNode;
}

export interface CodexComposerProps extends Omit<
  ComponentProps<"input">,
  "className" | "type"
> {
  className?: string;
  context?: string;
  inputClassName?: string;
}

export interface CodexDemoExec {
  command: string;
  id: string;
  output?: string;
  status?: CodexExecStatus;
}

export interface CodexDemoSession {
  assistantMessage: string;
  context: string;
  execs: CodexDemoExec[];
  header: {
    cwd: string;
    model: string;
    version: string;
  };
  promptPlaceholder: string;
  reasoning?: string;
  resultMessage: string;
  title: string;
  userMessage: string;
}
