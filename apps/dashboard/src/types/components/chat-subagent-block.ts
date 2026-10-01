import type { SourceCodeIcon } from "@hugeicons/core-free-icons";
import type { DynamicToolUIPart, ToolUIPart } from "ai";
import type { ReactNode } from "react";

export interface ChatSubagentConfig {
  labelKey: "codeResearcher" | "contentWriter" | "imageDesigner" | "fallback";
  icon: typeof SourceCodeIcon;
}

export type ChatSubagentResult =
  | { kind: "brief"; feature: string }
  | { kind: "draft"; title: string | null }
  | { kind: "image"; title: string | null }
  | { kind: "notFound"; reason: string | null }
  | { kind: "skipped"; reason: string | null }
  | { kind: "failed"; reason: string | null };

export interface ChatSubagentStep {
  toolCallId: string;
  toolName: string;
  state: string;
  input?: unknown;
  output?: unknown;
  errorText?: string;
}

export interface ChatSubagentBlockProps {
  agentName: string;
  toolCallId: string;
  state: string;
  isActive: boolean;
  output?: unknown;
  errorText?: string;
  // Tool calls made inside the subagent's child session, when available.
  children?: ReactNode;
  stepCount?: number;
  defaultOpen?: boolean;
}

export interface ChatSubagentToolPartProps {
  part: ToolUIPart | DynamicToolUIPart;
  isActive: boolean;
}
