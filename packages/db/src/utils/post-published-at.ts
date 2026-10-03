type PostStatus = "draft" | "published";

/**
 * The `published_at` write for a status change: stamped on the first
 * publish, cleared on unpublish, and left alone (`undefined`) otherwise, so
 * re-saving a published post keeps its original date.
 */
export function publishedAtForStatusChange(
  previous: PostStatus,
  next: PostStatus | undefined,
  now = new Date()
): Date | null | undefined {
  if (next === "draft") {
    return null;
  }
  if (next === "published" && previous !== "published") {
    return now;
  }
  return;
}
