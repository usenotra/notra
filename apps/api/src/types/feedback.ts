import type { z } from "@hono/zod-openapi";
import type { agentFeedback } from "@notra/db/schema";
import type { submitFeedbackRequestSchema } from "@notra/schemas/api/feedback";
import type { IngestTokenIdentity } from "@notra/utils/types/ingest-token";

import type {
  FeedbackNotFoundError,
  FeedbackProjectNotFoundError,
} from "../errors/feedback";
import type { DbClient } from "./db";

export type AgentFeedbackRow = typeof agentFeedback.$inferSelect;

type SubmitFeedbackBody = z.infer<typeof submitFeedbackRequestSchema>;

export type FeedbackDomainError =
  | FeedbackProjectNotFoundError
  | FeedbackNotFoundError;

export interface SubmitFeedbackProgramInput {
  db: DbClient;
  organizationId: string;
  body: SubmitFeedbackBody;
  /** Set when the request is authenticated with a feedback ingest token. */
  ingestProjectId?: string | null;
  userAgent?: string | null;
}

export interface SubmitFeedbackProgramSuccess {
  feedback: AgentFeedbackRow;
  deduplicated: boolean;
}

export type SerializedAgentFeedback = Omit<
  AgentFeedbackRow,
  "createdAt" | "updatedAt" | "resolvedAt"
> & {
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
};

export type FeedbackTokenVerification =
  | { success: true; identity: IngestTokenIdentity }
  | { success: false; error: string; status: 401 | 403 | 503 };
