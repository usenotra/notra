import type { z } from "@hono/zod-openapi";
import type { agentFeedback } from "@notra/db/schema";
import type { submitFeedbackRequestSchema } from "@notra/schemas/api/feedback";
import type { IngestTokenIdentity } from "@notra/utils/types/ingest-token";

export type AgentFeedbackRow = typeof agentFeedback.$inferSelect;

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

export type SubmitFeedbackBody = z.infer<typeof submitFeedbackRequestSchema>;

export type SubmitFeedbackOutcome =
  | {
      kind: "accepted";
      feedback: SerializedAgentFeedback;
      deduplicated: boolean;
    }
  | { kind: "project_not_found" }
  | { kind: "not_found" };
