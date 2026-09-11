import "zod/compile";
import { z } from "zod";

export const agentCreateSessionResponseSchema = z.object({
  ok: z.literal(true),
  sessionId: z.string().min(1),
  continuationToken: z.string().min(1),
});

export const agentFollowUpResponseSchema = z.looseObject({
  ok: z.literal(true),
  continuationToken: z.string().min(1).optional(),
});

export const agentStreamEventSchema = z.looseObject({
  type: z.string(),
  data: z.record(z.string(), z.unknown()).optional(),
});

export class AgentTaskTimeoutError extends Error {
  constructor(sessionId: string) {
    super(`Agent task session ${sessionId} did not complete in time`);
    this.name = "AgentTaskTimeoutError";
  }
}

export class AgentTaskFailedError extends Error {
  constructor(sessionId: string, detail: string) {
    super(`Agent task session ${sessionId} failed: ${detail}`);
    this.name = "AgentTaskFailedError";
  }
}
