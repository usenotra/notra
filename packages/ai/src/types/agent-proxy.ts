export type AgentUpstreamFetch = (
  path: string,
  init: { method: string; body?: string; headers?: Record<string, string> }
) => Promise<Response>;

export interface AgentSessionScopeRecord {
  organizationId: string;
  userId?: string | null;
  chatId?: string | null;
  surface: string;
  contentId?: string | null;
  collectionId?: string | null;
}

export interface CreateAgentSessionParams {
  fetchUpstream: AgentUpstreamFetch;
  scope: AgentSessionScopeRecord;
  message: string;
  mode?: "conversation" | "task";
  outputSchema?: Record<string, unknown>;
}

export interface CreateAgentSessionResult {
  agentSessionId: string;
  eveSessionId: string;
}

export interface ForwardAgentFollowUpParams {
  fetchUpstream: AgentUpstreamFetch;
  eveSessionId: string;
  message?: string;
  inputResponses?: Array<{ requestId: string; optionId: string }>;
}

export interface ForwardAgentStreamParams {
  fetchUpstream: AgentUpstreamFetch;
  eveSessionId: string;
  startIndex?: string | null;
}
