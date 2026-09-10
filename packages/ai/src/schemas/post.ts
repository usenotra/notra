// biome-ignore lint/performance/noNamespaceImport: Zod recommended way to import
import * as z from "zod";

export const POST_SLUG_MAX_LENGTH = 160;
export const POST_SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function supportsPostSlug(contentType: string) {
  return contentType === "blog_post" || contentType === "changelog";
}

export const createPostDraftFieldsSchema = z.object({
  title: z.string(),
  markdown: z.string(),
});

export const createdPostToolOutputSchema = z
  .object({
    postId: z.string().min(1),
  })
  .passthrough();
