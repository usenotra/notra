import "zod/compile";
// biome-ignore lint/performance/noNamespaceImport: Zod recommended way of importing
import * as z from "zod";

export const clearCompletedGenerationSchema = z.object({
  runId: z.string().min(1),
});
