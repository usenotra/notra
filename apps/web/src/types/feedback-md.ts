import type { ClaudeCodeToolCallStatus } from "@notra/ui/components/ai-skins/claude-code/claude-code-tool-call";
import type { ComponentType, ReactNode, SVGProps } from "react";

export interface FeedbackMdPrinciple {
  title: string;
  description: string;
}

export interface FeedbackMdSection {
  heading: string;
  required: boolean;
  description: string;
}

export interface FeedbackMdSibling {
  file: string;
  answers: string;
  direction: "site to agent" | "agent to site";
  href: string;
}

export interface FeedbackMdAdopter {
  name: string;
  label: string;
  siteUrl: string;
  feedbackUrl: string;
  Logo: ComponentType<SVGProps<SVGSVGElement>>;
}

export interface FeedbackMdQuestion {
  id: string;
  question: string;
  answer: string;
}

export interface FeedbackMdFaqRowProps {
  item: FeedbackMdQuestion;
  open: boolean;
  onToggle: () => void;
}

export interface FeedbackMdClient {
  id: "curl" | "claude-code" | "codex";
  label: string;
  iconSrc?: string;
  invertInDark: boolean;
  command: string;
}

export interface FeedbackMdCommandTabsProps {
  className?: string;
}

export interface FeedbackMdTerminalHeader {
  version: string;
  model: string;
  org: string;
  cwd: string;
  tips: string[];
  whatsNew: string[];
}

export interface FeedbackMdTerminalToolCall {
  tool: string;
  arg: string;
  result: string;
  status: ClaudeCodeToolCallStatus;
}

export type FeedbackMdLineKind =
  | "title"
  | "heading"
  | "list"
  | "text"
  | "blank";

export interface FeedbackMdLine {
  kind: FeedbackMdLineKind;
  text: string;
  section: string | null;
}

export interface FeedbackMdFilePreviewProps {
  source: string;
  filename: string;
  activeHeading: string | null;
}

export interface FeedbackMdCopyButtonProps {
  text: string;
  successMessage: string;
  children: string;
}

export interface FeedbackMdSectionProps {
  title: ReactNode;
  description: string;
  children: ReactNode;
}
