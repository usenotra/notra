import "zod/compile";
import {
  POST_MARKDOWN_MAX_LENGTH,
  postTitleSchema,
} from "@notra/ai/schemas/limits";
import { POST_SLUG_MAX_LENGTH } from "@notra/ai/schemas/post";
// biome-ignore lint/performance/noNamespaceImport: Zod recommended way to import
import * as z from "zod";

import { MANUAL_POST_CONTENT_TYPES } from "../../constants/content";

export const manualPostContentTypeSchema = z.enum(MANUAL_POST_CONTENT_TYPES);
export type ManualPostContentType = z.infer<typeof manualPostContentTypeSchema>;

export const optionalPostSlugSchema = z
  .string()
  .trim()
  .slugify()
  .max(POST_SLUG_MAX_LENGTH);

export const postSlugSchema = optionalPostSlugSchema.min(1);

export const createPostFieldsSchema = z.object({
  title: postTitleSchema,
  contentType: manualPostContentTypeSchema,
  slug: postSlugSchema.nullable().optional(),
  markdown: z.string().max(POST_MARKDOWN_MAX_LENGTH).optional(),
});
export type CreatePostFields = z.infer<typeof createPostFieldsSchema>;
