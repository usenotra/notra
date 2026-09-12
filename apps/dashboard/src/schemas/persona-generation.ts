import { z } from "zod";

export const personaGenerationJobSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  projectId: z.string(),
  personaId: z.string().optional(),
  brief: z.string().trim().min(1).max(2000).optional(),
  status: z.enum(["queued", "running", "completed", "failed"]),
  startedAt: z.string(),
  runId: z.string().nullable().default(null),
  error: z.string().nullable().default(null),
});
