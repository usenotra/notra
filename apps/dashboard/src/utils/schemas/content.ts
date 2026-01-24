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

export const postSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  markdown: z.string(),
  contentType: contentTypeSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Post = z.infer<typeof postSchema>;

export const postsResponseSchema = z.object({
  posts: z.array(postSchema),
  nextCursor: z.string().nullable(),
});

export type PostsResponse = z.infer<typeof postsResponseSchema>;

export const editContentSchema = z.object({
  instruction: z.string().min(1, "Instruction is required"),
  currentMarkdown: z.string(),
  selectedText: z.string().optional(),
});

export type EditContentInput = z.infer<typeof editContentSchema>;

export const contextItemSchema = z.object({
  type: z.literal("github-repo"),
  owner: z.string(),
  repo: z.string(),
  integrationId: z.string(),
});

export type ContextItem = z.infer<typeof contextItemSchema>;

export const chatRequestSchema = z.object({
  messages: z.array(z.any()), // UIMessage from ai sdk
  currentMarkdown: z.string(),
  selectedText: z.string().optional(),
  context: z.array(contextItemSchema).optional(),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;

export const updateContentSchema = z.object({
  markdown: z.string(),
});

export type UpdateContentInput = z.infer<typeof updateContentSchema>;