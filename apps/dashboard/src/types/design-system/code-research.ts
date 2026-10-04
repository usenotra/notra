import type { UIMessage } from "ai";

export type CodeResearchAgent =
  | "notra"
  | "code-researcher"
  | "content-writer"
  | "platform";

export type CodeResearchBoxPhase =
  | "none"
  | "creating"
  | "cloning"
  | "checkout"
  | "ready"
  | "expired"
  | "disabled";

export type CodeResearchRedisState =
  | "empty"
  | "miss"
  | "lease"
  | "hit"
  | "stored"
  | "expired";

export type CodeResearchStageStatus =
  | "pending"
  | "running"
  | "done"
  | "skipped";

export type CodeResearchStageId =
  | "lookup"
  | "lease"
  | "attach"
  | "token"
  | "create"
  | "clone"
  | "checkout"
  | "store"
  | "overview";

export interface CodeResearchStage {
  id: CodeResearchStageId;
  label: string;
  detail: string;
  status: CodeResearchStageStatus;
  realMs?: number;
}

export interface CodeResearchSandboxState {
  phase: CodeResearchBoxPhase;
  boxId: string | null;
  checkedOut: string | null;
  headSha: string | null;
  expiresLabel: string | null;
  redis: CodeResearchRedisState;
  execCount: number;
  stages: CodeResearchStage[];
}

export type CodeResearchSandboxPatch = Partial<
  Omit<CodeResearchSandboxState, "stages">
> & {
  stages?: Partial<Record<CodeResearchStageId, CodeResearchStageStatus>>;
  stageMs?: Partial<Record<CodeResearchStageId, number>>;
  resetStages?: boolean;
};

export type CodeResearchChatOp =
  | { kind: "user"; messageId: string; text: string }
  | { kind: "assistant-start"; messageId: string }
  | { kind: "text"; text: string }
  | {
      kind: "tool-start";
      toolCallId: string;
      toolName: string;
      input: unknown;
      agent: CodeResearchAgent;
    }
  | {
      kind: "tool-end";
      toolCallId: string;
      output?: unknown;
      errorText?: string;
    }
  | { kind: "assistant-end" }
  | { kind: "divider"; id: string; label: string };

export interface CodeResearchLogEntry {
  agent: CodeResearchAgent;
  label: string;
  detail?: string;
  realMs?: number;
}

export interface CodeResearchExplanation {
  title: string;
  body: string;
}

export interface CodeResearchStep {
  delayMs: number;
  chat?: CodeResearchChatOp;
  sandbox?: CodeResearchSandboxPatch;
  log?: CodeResearchLogEntry;
  explain?: CodeResearchExplanation;
}

export interface CodeResearchScenario {
  id: string;
  label: string;
  description: string;
  steps: CodeResearchStep[];
  // Steps before this index are history and are applied instantly on select.
  startAt: number;
}

export interface CodeResearchChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  parts: UIMessage["parts"];
  isStreaming: boolean;
}

export type CodeResearchTimelineItem =
  | { kind: "message"; message: CodeResearchChatMessage }
  | { kind: "divider"; id: string; label: string };

export interface CodeResearchPlaybackState {
  timeline: CodeResearchTimelineItem[];
  sandbox: CodeResearchSandboxState;
  log: (CodeResearchLogEntry & { step: number })[];
  explanation: CodeResearchExplanation | null;
  toolAgents: Record<string, CodeResearchAgent>;
}

export interface CodeResearchToolCall {
  id: string;
  agent: CodeResearchAgent;
  toolName: string;
  input: unknown;
  output?: unknown;
  errorText?: string;
  realMs: number;
  logDetail?: string;
  explainStart?: CodeResearchExplanation;
  explainEnd?: CodeResearchExplanation;
  sandboxStart?: CodeResearchSandboxPatch;
  sandboxEnd?: CodeResearchSandboxPatch;
}
