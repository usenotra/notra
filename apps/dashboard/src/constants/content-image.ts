/** Root-relative URL prefix for dashboard-served content images and videos. */
export const CONTENT_IMAGE_ROUTE = "/api/uploads/content-images";

/** Reject uploads before Sharp reads them. */
export const MAX_CONTENT_IMAGE_INPUT_BYTES = 20 * 1024 * 1024;

/**
 * Longest edge used only when a lossless-enough encode still exceeds GitHub's
 * per-file cap. Blog images stay full size below that cap.
 */
export const CONTENT_IMAGE_FALLBACK_MAX_EDGE = 2400;

export const CONTENT_IMAGE_MIME_EXTENSIONS = {
  "image/avif": "avif",
  "image/gif": "gif",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

export type ContentImageMimeType = keyof typeof CONTENT_IMAGE_MIME_EXTENSIONS;
