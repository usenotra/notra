import type { PostCollectionSource } from "@notra/schemas/dashboard/content";

export const COLLECTIONS_PAGE_SIZE = 20;
export const COLLECTION_TABLE_ROW_HEIGHT = 56;
export const COLLECTION_TABLE_SKELETON_ROWS = 6;
export const COLLECTION_GRID_SKELETON_KEYS = Array.from(
  { length: COLLECTION_TABLE_SKELETON_ROWS },
  (_, index) => `collection-${index}`
);
export const COLLECTION_TYPE_STACK_LIMIT = 4;
export const CONTENT_COLLECTION_VIEWS = ["list", "grid"] as const;

export const COLLECTION_SOURCE_LABELS: Record<PostCollectionSource, string> = {
  manual: "Manual",
  chat: "Chat",
  schedule: "Schedule",
  automation: "Automation",
  api: "API",
  backfill: "Backfill",
};

export const COLLECTION_STATUS_LABELS = {
  generating: "Generating",
  published: "Published",
  draft: "Draft",
  empty: "Empty",
} as const;
