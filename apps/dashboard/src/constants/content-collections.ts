export const COLLECTIONS_PAGE_SIZE = 20;
export const COLLECTION_TABLE_ROW_HEIGHT = 56;
export const COLLECTION_TABLE_SKELETON_ROWS = 6;
export const COLLECTION_GRID_SKELETON_KEYS = Array.from(
  { length: COLLECTION_TABLE_SKELETON_ROWS },
  (_, index) => `collection-${index}`
);
export const COLLECTION_TYPE_STACK_LIMIT = 4;
export const CONTENT_COLLECTION_VIEWS = ["list", "grid"] as const;
