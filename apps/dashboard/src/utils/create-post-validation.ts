import { POST_TITLE_MAX_LENGTH } from "@notra/ai/schemas/limits";
import { POST_SLUG_MAX_LENGTH } from "@notra/ai/schemas/post";
import { postSlugPreviewSchema } from "@notra/schemas/dashboard/content";

export function validateCreatePostTitle(value: string): string | undefined {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return "Title is required";
  }
  if (trimmed.length > POST_TITLE_MAX_LENGTH) {
    return `Title must be ${POST_TITLE_MAX_LENGTH} characters or fewer`;
  }
  return undefined;
}

export function validateCreatePostSlug(value: string): string | undefined {
  if (postSlugPreviewSchema.parse(value).length > POST_SLUG_MAX_LENGTH) {
    return `Slug must be ${POST_SLUG_MAX_LENGTH} characters or fewer`;
  }
  return undefined;
}
