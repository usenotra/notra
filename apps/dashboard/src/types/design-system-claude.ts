import type {
  ClaudeCodeEffort,
  ClaudeCodeMode,
} from "@notra/ui/components/ai-skins/claude-code/claude-code-prompt";
import type { ClaudeCodeTodo } from "@notra/ui/components/ai-skins/claude-code/claude-code-todo-list";
import type { ClaudeCodeToolCallStatus } from "@notra/ui/components/ai-skins/claude-code/claude-code-tool-call";

export interface ClaudeStoryHeader {
  version: string;
  model: string;
  org: string;
  cwd: string;
  tips: string[];
  whatsNew: string[];
}

export interface ClaudeStoryToolCall {
  id: string;
  tool: string;
  arg?: string;
  result: string;
  status?: ClaudeCodeToolCallStatus;
  detail?: string;
}

export interface ClaudeStoryTurnSummary {
  verb: string;
  duration: string;
  doneAt: string;
}

export interface ClaudeStorySpinner {
  verb: string;
  elapsed: string;
  tokens: number;
  details: string[];
  tip: string;
}

export interface ClaudeStorySession {
  title: string;
  header: ClaudeStoryHeader;
  userMessage: string;
  commands: ClaudeStoryToolCall[];
  assistantMessage: string;
  summary: ClaudeStoryTurnSummary;
  followUpMessage: string;
  todos: ClaudeCodeTodo[];
  pendingToolCall: ClaudeStoryToolCall;
  spinner: ClaudeStorySpinner;
  promptPlaceholder: string;
  pullRequestNumber: number;
}

export interface ClaudeStoryPromptVariant {
  id: string;
  mode: ClaudeCodeMode;
  effort: ClaudeCodeEffort | false;
}
