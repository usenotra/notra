import "zod/compile";
// biome-ignore lint/performance/noNamespaceImport: Zod recommended way to import
import * as z from "zod";

export const workosWebhookPayloadSchema = z.object({
  id: z.string().min(1),
  event: z.string().min(1),
  data: z.record(z.string(), z.unknown()),
  created_at: z.string().min(1),
});
