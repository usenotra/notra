// biome-ignore lint/performance/noNamespaceImport: Zod recommended way to import
import * as z from "zod";

export const POST_SLUG_MAX_LENGTH = 160;
export const POST_SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
/**
 * Tool-call markup that ends up inside a field when a model breaks its own
 * call format, e.g. `</markdown>\n<parameter name="recommendations">`.
 */
export const LEAKED_TOOL_MARKUP_REGEX =
  /<\/(?:markdown|recommendations)>|<parameter name="/;

export function supportsPostSlug(contentType: string) {
  return contentType === "blog_post" || contentType === "changelog";
}

export const createPostDraftFieldsSchema = z.object({
  title: z.string(),
  markdown: z.string(),
});

export const createdPostToolOutputSchema = z.looseObject({
  postId: z.string().min(1),
});
