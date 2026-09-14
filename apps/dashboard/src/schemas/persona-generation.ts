import { z } from "zod";

export const personaGenerationJobSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  projectId: z.string(),
  personaId: z.string().optional(),
  brief: z.string().trim().min(1).max(2000).optional(),
  promptsOnly: z.boolean().optional(),
  status: z.enum(["queued", "running", "completed", "failed"]),
  startedAt: z.string(),
  runId: z.string().nullable(),
  error: z.string().nullable(),
});
