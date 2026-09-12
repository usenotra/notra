import "zod/compile";
import { irisOutboxArtifactSchema } from "@notra/ai/schemas/autonomy/outbox";
import { organizationIdSchema } from "@notra/schemas/dashboard/auth/organization";
// biome-ignore lint/performance/noNamespaceImport: Zod recommended way of importing
import * as z from "zod";

import { IRIS_SIGNALS_PAGE_SIZE } from "../../constants/dashboard/iris";

export const irisPlannerDecisionPreviewSchema = z.object({
  decision: z.string().nullish(),
  reason: z.string().nullish(),
});

export const irisOrganizationInputSchema = z.object({
  organizationId: organizationIdSchema,
});
export type IrisOrganizationInput = z.infer<typeof irisOrganizationInputSchema>;

export const irisMandateInputSchema = irisOrganizationInputSchema.extend({
  mandateId: z.string().trim().min(1),
});
export type IrisMandateInput = z.infer<typeof irisMandateInputSchema>;

export const irisListRunsInputSchema = irisOrganizationInputSchema.extend({
  cursor: z.iso.datetime().nullish(),
});
export type IrisListRunsInput = z.infer<typeof irisListRunsInputSchema>;

export const irisListSignalsInputSchema = irisOrganizationInputSchema.extend({
  limit: z
    .number()
    .int()
    .min(1)
    .max(IRIS_SIGNALS_PAGE_SIZE)
    .default(IRIS_SIGNALS_PAGE_SIZE),
});
export type IrisListSignalsInput = z.infer<typeof irisListSignalsInputSchema>;

export const irisArtifactListSchema = z.array(irisOutboxArtifactSchema);

export const irisArtifactContainerSchema = z.object({
  artifacts: irisArtifactListSchema.optional(),
});
