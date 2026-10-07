export const COLLECTIONS_PAGE_SIZE = 20;
export const COLLECTION_TABLE_ROW_HEIGHT = 56;
export const COLLECTION_TABLE_SKELETON_ROWS = 6;
/** Hover time before the first table tooltip opens; later ones glide over. */
export const COLLECTION_TABLE_TOOLTIP_DELAY_MS = 300;
export const COLLECTION_TYPE_STACK_LIMIT = 4;
/** Tabs of the content page: the collections table and the calendar. */
export const CONTENT_LIST_VIEWS = ["list", "calendar"] as const;
/** Younger than this, a collection reads "just now" instead of "0 seconds ago". */
export const COLLECTION_JUST_NOW_MS = 60_000;
