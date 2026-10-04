import type { PostCollectionSummary } from "@notra/schemas/dashboard/content";

import type {
  CollectionStatus,
  CollectionsTranslator,
} from "@/types/content/collection";

export function collectionTitle(collection: PostCollectionSummary): string {
  const postTitle =
    !collection.isGenerating && collection.postCount === 1
      ? collection.singlePost?.title.trim()
      : undefined;
  // A single post with a blank title falls back to its collection's name.
  return postTitle || collection.name;
}

export function collectionHref(
  organizationSlug: string,
  collection: PostCollectionSummary
): string {
  if (
    !collection.isGenerating &&
    collection.postCount === 1 &&
    collection.singlePost
  ) {
    return `/${organizationSlug}/content/${collection.singlePost.id}`;
  }
  return `/${organizationSlug}/collection/${collection.id}`;
}

export function collectionStatus(
  collection: PostCollectionSummary
): CollectionStatus {
  if (collection.isGenerating) {
    return "generating";
  }
  if (collection.statusSummary.published > 0) {
    return "published";
  }
  if (collection.postCount > 0) {
    return "draft";
  }
  return "empty";
}

export function collectionMeta(
  collection: PostCollectionSummary,
  t: CollectionsTranslator
): string {
  const source = t("source", { source: collection.source });

  if (collection.isGenerating) {
    const expected = collection.expectedPostCount;
    return expected !== null && expected > 0
      ? t("metaGeneratingProgress", {
          source,
          ready: Math.min(collection.postCount, expected),
          expected,
        })
      : t("metaGeneratingCount", { source, count: collection.postCount });
  }

  const { published } = collection.statusSummary;
  if (published > 0 && published < collection.postCount) {
    return t("metaPartiallyPublished", {
      source,
      count: collection.postCount,
      published,
    });
  }
  if (collection.postCount === 1) {
    return t("metaSingle", { source });
  }
  if (collection.postCount === 0) {
    return t("metaEmpty", { source });
  }
  return t("metaCount", { source, count: collection.postCount });
}
