import type * as React from "react";

export type CodexExecStatus = "ran" | "running" | "failed";

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
  verb: CodexExploredVerb;
  target: string;
  scope?: string;
}

export interface CodexHeaderProps {
  version?: string;
  cwd?: string;
  greeting?: string | null;
  className?: string;
}

export interface CodexMessageProps {
  from?: "user" | "assistant";
  className?: string;
  children: React.ReactNode;
}

export interface CodexExecProps {
  command: string;
  output?: string;
  status?: CodexExecStatus;
  maxLines?: number;
  moreLines?: number;
  className?: string;
}

export interface CodexExploredProps {
  items: CodexExploredItem[];
  active?: boolean;
  showDetails?: boolean;
  className?: string;
}

export interface CodexWorkingProps {
  label?: string;
  elapsed?: string;
  className?: string;
}

export interface CodexTableProps {
  headers: string[];
  rows: string[][];
  codeColumns?: number[];
  className?: string;
}

export interface CodexListProps {
  items: React.ReactNode[];
  className?: string;
}

export interface CodexComposerProps {
  value?: string;
  defaultValue?: string;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
  placeholder?: string;
  model?: string;
  effort?: string;
  cwd?: string;
  task?: string;
  context?: string;
  warnings?: number;
  className?: string;
  inputClassName?: string;
  ref?: React.Ref<HTMLInputElement>;
}
