import "zod/compile";
// biome-ignore lint/performance/noNamespaceImport: Zod recommended way of importing
import * as z from "zod";

export const irisTriggerSchema = z.enum(["signal", "wake", "manual", "repair"]);
export type IrisTrigger = z.infer<typeof irisTriggerSchema>;

export const irisWorkflowPayloadSchema = z.object({
  organizationId: z.string().trim().min(1),
  trigger: irisTriggerSchema,
  executionId: z.string().trim().min(1),
});
export type IrisWorkflowPayload = z.infer<typeof irisWorkflowPayloadSchema>;

export const irisWakeDeliverySchema = z.object({
  organizationId: z.string().trim().min(1),
  trigger: z.literal("wake").default("wake"),
});
export type IrisWakeDelivery = z.infer<typeof irisWakeDeliverySchema>;
