import type { AGENT_SURFACES } from "@notra/ai/constants/agent";

export type AgentSurface = (typeof AGENT_SURFACES)[number];

export interface AgentSessionScope {
  organizationId: string;
  userId?: string;
  chatId?: string;
  surface: AgentSurface;
  contentId?: string;
  collectionId?: string;
  contentType?: string;
  autoPublish?: boolean;
  useMarkup?: boolean;
  chargeAiCredits?: boolean;
  voiceId?: string;
  brandAgentType?: string;
  sourceMetadata?: object;
  generationConfig?: object;
}

export interface StartAgentSessionInput {
  scope: AgentSessionScope;
  message: string;
  mode?: "conversation" | "task";
  outputSchema?: Record<string, unknown>;
}

export interface StartAgentSessionResult {
  agentSessionId: string;
  eveSessionId: string;
}

export interface AgentTaskRunResult {
  eveSessionId: string;
  output: unknown;
}
