import "zod/compile";
// biome-ignore lint/performance/noNamespaceImport: Zod recommended way of importing
import * as z from "zod";

export const onboardingAgentWorkflowPayloadSchema = z.object({
  organizationId: z.string().trim().min(1),
  domain: z.string().trim().min(1),
  email: z.email().optional(),
  organizationName: z.string().trim().min(1).optional(),
  reservedAt: z.iso.datetime(),
});
