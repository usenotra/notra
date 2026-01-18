// biome-ignore lint/performance/noNamespaceImport: Zod recommended way to import
import * as z from "zod";

export const generateChangelogBodySchema = z.object({
  prompt: z.string().min(1, "Prompt is required"),
});

export type GenerateChangelogBody = z.infer<typeof generateChangelogBodySchema>;
