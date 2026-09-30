import type { FEEDBACK_KINDS, FEEDBACK_SENTIMENTS } from "./constants";

export type FeedbackKind = (typeof FEEDBACK_KINDS)[number];
export type FeedbackSentiment = (typeof FEEDBACK_SENTIMENTS)[number];

export interface FeedbackInput {
  message: string;
  title?: string;
  kind?: FeedbackKind;
  sentiment?: FeedbackSentiment;
  contextUrl?: string;
  agentClient?: string;
  agentModel?: string;
  toolVersion?: string;
  externalId?: string;
  idempotencyKey?: string;
  projectId?: string;
  metadata?: Record<string, unknown>;
}

export interface FeedbackClientOptions {
  url?: string;
  token?: string;
  endpoint?: string;
  fetch?: typeof globalThis.fetch;
  timeoutMs?: number;
}

export interface FeedbackSubmitResult {
  id: string;
  deduplicated: boolean;
}

export interface FeedbackToolOptions extends FeedbackClientOptions {
  productName?: string;
  toolName?: string;
  description?: string;
  defaults?: Pick<
    FeedbackInput,
    "agentClient" | "agentModel" | "toolVersion" | "projectId" | "metadata"
  >;
  onError?: (error: unknown) => void;
}

export interface FeedbackToolResult {
  content: { type: "text"; text: string }[];
  structuredContent?: FeedbackSubmitResult;
  isError?: boolean;
}

export interface FeedbackToolServer {
  registerTool(
    name: string,
    config: {
      description: string;
      annotations?: Record<string, unknown>;
      inputSchema: Record<string, unknown>;
      outputSchema?: Record<string, unknown>;
    },
    handler: (args: Record<string, unknown>) => Promise<FeedbackToolResult>
  ): unknown;
}
