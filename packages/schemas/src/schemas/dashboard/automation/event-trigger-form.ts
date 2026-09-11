import "zod/compile";
import {
  SUPPORTED_AUTOMATION_OUTPUT_TYPES,
  WEBHOOK_EVENT_TYPES,
} from "@notra/schemas/dashboard/integrations";
// biome-ignore lint/performance/noNamespaceImport: Zod recommended way to import
import * as z from "zod";

export const eventTriggerFormSchema = z.object({
  eventType: z.enum(WEBHOOK_EVENT_TYPES),
  outputType: z.enum(SUPPORTED_AUTOMATION_OUTPUT_TYPES),
  repositoryIds: z.array(z.string()).min(1, "Select at least one repository"),
  brandVoiceId: z.string(),
  autoPublish: z.boolean(),
  includePreReleases: z.boolean(),
});

export type EventTriggerFormValues = z.infer<typeof eventTriggerFormSchema>;
