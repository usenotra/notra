export const CONTENT_TITLE_REGEX = /^#\s+(.+)$/m;
export const SAVE_BAR_SELECTOR = "[data-save-bar]";
/** The save flow lives in the bottom-right corner, so its toasts follow it there. */
export const CONTENT_SAVE_TOAST_POSITION = "bottom-right" as const;
/** Drafts persist locally after this pause. Linked GitHub PRs stay explicit. */
export const CONTENT_AUTOSAVE_MS = 1000;
