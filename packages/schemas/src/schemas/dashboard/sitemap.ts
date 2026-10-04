import "zod/compile";
// biome-ignore lint/performance/noNamespaceImport: Zod recommended way to import
import * as z from "zod";

export const createSitemapSchema = z.object({
  organizationId: z.string().min(1),
  voiceId: z.string().min(1),
  url: z.url("Please enter a valid URL"),
  label: z.string().trim().min(1).max(60).optional(),
});

export type CreateSitemapInput = z.infer<typeof createSitemapSchema>;

export const deleteSitemapSchema = z.object({
  organizationId: z.string().min(1),
  voiceId: z.string().min(1),
  sitemapId: z.string().min(1),
});

export type DeleteSitemapInput = z.infer<typeof deleteSitemapSchema>;

const sitemapPageCategorySchema = z.enum([
  "crawled",
  "failed",
  "queued",
  "redirect",
]);

export const listSitemapPagesSchema = z.object({
  organizationId: z.string().min(1),
  voiceId: z.string().min(1),
  sitemapId: z.string().min(1),
  category: sitemapPageCategorySchema.optional(),
  cursor: z.string().optional(),
  limit: z.number().int().optional(),
  query: z.string().optional(),
});
