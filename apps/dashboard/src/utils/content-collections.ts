import type { PostCollectionSummary } from "@notra/schemas/dashboard/content";

import {
  COLLECTION_SOURCE_LABELS,
  COLLECTION_STATUS_LABELS,
} from "@/constants/content-collections";
import type { CollectionStatus } from "@/types/content/collection";

function pluralizePosts(count: number): string {
  return `${count} ${count === 1 ? "post" : "posts"}`;
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

export function collectionStatusLabel(status: CollectionStatus): string {
  return COLLECTION_STATUS_LABELS[status];
}

/** Secondary line under the collection name: where it came from and how far along it is. */
export function collectionMeta(collection: PostCollectionSummary): string {
  const source = COLLECTION_SOURCE_LABELS[collection.source];

  if (collection.isGenerating) {
    const expected = collection.expectedPostCount;
    const progress =
      expected !== null && expected > 0
        ? `${Math.min(collection.postCount, expected)} of ${pluralizePosts(expected)} ready`
        : `${pluralizePosts(collection.postCount)} ready`;
    return `${source} · ${progress}`;
  }

  const { published } = collection.statusSummary;
  if (published > 0 && published < collection.postCount) {
    return `${source} · ${pluralizePosts(collection.postCount)} · ${published} published`;
  }
  return `${source} · ${pluralizePosts(collection.postCount)}`;
}
