import type {
  AgentFeedbackKind,
  AgentFeedbackSentiment,
} from "@notra/db/types/agent-feedback";

export interface ClassifyAgentFeedbackParams {
  organizationId: string;
  feedbackId?: string;
  message: string;
  title?: string | null;
  contextUrl?: string | null;
  agentClient?: string | null;
  /** Fields the caller preserves; omit to retain full generated-title behavior. */
  suppliedFields?: Partial<AgentFeedbackClassification>;
}

export interface AgentFeedbackClassification {
  sentiment: AgentFeedbackSentiment;
  kind: AgentFeedbackKind;
  title: string;
}
