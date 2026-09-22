export const CONTENT_TITLE_REGEX = /^#\s+(.+)$/m;
export const SAVE_BAR_SELECTOR = "[data-save-bar]";
export const CONTENT_EDITOR_HEADER_SLOT_ID = "content-editor-header-actions";
/** Save toasts follow the header control. */
export const CONTENT_SAVE_TOAST_POSITION = "bottom-right" as const;
/** Drafts persist locally after this pause. Linked GitHub PRs stay explicit. */
export const CONTENT_AUTOSAVE_MS = 1000;
