// biome-ignore lint/performance/noNamespaceImport: Zod recommended way to import
import * as z from "zod";

export const contentTypeSchema = z.enum([
  "changelog",
  "blog_post",
  "twitter_post",
  "linkedin_post",
  "investor_update",
]);

export type ContentType = z.infer<typeof contentTypeSchema>;

export const contentSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  markdown: z.string(),
  contentType: contentTypeSchema,
  date: z.string(),
});

export type ContentResponse = z.infer<typeof contentSchema>;

export const editContentSchema = z.object({
  instruction: z.string().min(1, "Instruction is required"),
  currentMarkdown: z.string(),
  selectedText: z.string().optional(),
});

export type EditContentInput = z.infer<typeof editContentSchema>;
