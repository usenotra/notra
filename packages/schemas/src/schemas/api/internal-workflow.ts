import "zod/compile";
import { z } from "zod";

export const internalWorkflowStartResponseSchema = z.object({
  runId: z.string(),
});

export const internalWorkflowErrorResponseSchema = z.object({
  code: z.string().optional(),
});
