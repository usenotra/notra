import type { z } from "@hono/zod-openapi";
import type { agentFeedback } from "@notra/db/schema";
import type {
  listFeedbackQuerySchema,
  submitFeedbackRequestSchema,
  updateFeedbackRequestSchema,
} from "@notra/schemas/api/feedback";
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

interface FeedbackProgramInput {
  db: DbClient;
  organizationId: string;
}

export interface SubmitFeedbackProgramInput extends FeedbackProgramInput {
  body: SubmitFeedbackBody;
  /** Set when the request is authenticated with a project-bound ingest token. */
  ingestProjectId?: string;
  userAgent?: string | null;
}

export interface ListFeedbackProgramInput extends FeedbackProgramInput {
  query: z.infer<typeof listFeedbackQuerySchema>;
}

export interface NamedFeedbackProgramInput extends FeedbackProgramInput {
  feedbackId: string;
}

export interface UpdateFeedbackProgramInput extends NamedFeedbackProgramInput {
  body: z.infer<typeof updateFeedbackRequestSchema>;
}

export interface SubmitFeedbackProgramSuccess {
  feedback: AgentFeedbackRow;
  deduplicated: boolean;
}

export interface ListFeedbackProgramSuccess {
  feedback: AgentFeedbackRow[];
  pagination: {
    limit: number;
    currentPage: number;
    nextPage: number | null;
    previousPage: number | null;
    totalPages: number;
    totalItems: number;
  };
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
