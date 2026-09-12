export const SVG_MIME_TYPE = "image/svg+xml";

export const ALLOWED_RASTER_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/avif",
] as const;

export const ALLOWED_MIME_TYPES = [
  ...ALLOWED_RASTER_MIME_TYPES,
  SVG_MIME_TYPE,
] as const;

export const ALLOWED_CHAT_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/plain",
  "text/markdown",
] as const;

export const ALLOWED_OPENAI_CHAT_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
] as const;

export type AllowedRasterMimeType = (typeof ALLOWED_RASTER_MIME_TYPES)[number];
export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];
export type AllowedChatMimeType = (typeof ALLOWED_CHAT_MIME_TYPES)[number];

export const MAX_AVATAR_FILE_SIZE = 5 * 1024 * 1024;
export const MAX_LOGO_FILE_SIZE = 5 * 1024 * 1024;
export const MAX_BRAND_ASSET_FILE_SIZE = 5 * 1024 * 1024;
export const MAX_CONTENT_FILE_SIZE = 250 * 1024 * 1024;
export const MAX_CHAT_FILE_SIZE = 32 * 1024 * 1024;
export const MAX_CHAT_ATTACHMENTS = 10;
export const MAX_SVG_CONTENT_SIZE = 2 * 1024 * 1024;

export const PASTE_TO_ATTACHMENT_THRESHOLD = 2000;

export const MIME_DISPLAY_LABELS: Record<string, string> = {
  "text/plain": "Text",
  "text/markdown": "Markdown",
  "application/pdf": "PDF",
  "image/png": "PNG",
  "image/jpeg": "JPEG",
  "image/gif": "GIF",
  "image/webp": "WebP",
};
