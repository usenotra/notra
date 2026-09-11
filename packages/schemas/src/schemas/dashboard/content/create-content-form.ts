import "zod/compile";
import {
  contentDataPointSettingsSchema,
  onDemandContentTypeSchema,
} from "@notra/schemas/dashboard/content";
import { LOOKBACK_WINDOWS } from "@notra/schemas/dashboard/integrations";
// biome-ignore lint/performance/noNamespaceImport: Zod recommended way to import
import * as z from "zod";

export const createContentFormSchema = z.object({
  formats: z
    .array(onDemandContentTypeSchema)
    .min(1, "Select at least one content format"),
  repositoryIds: z.array(z.string()).min(1, "Select at least one source"),
  brandVoiceIds: z.array(z.string()),
  lookbackWindow: z.enum(LOOKBACK_WINDOWS),
  dataPoints: contentDataPointSettingsSchema,
});

export type CreateContentFormValues = z.infer<typeof createContentFormSchema>;
