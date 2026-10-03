import { GITHUB_CONTENT_MAX_SINGLE_ASSET_BYTES } from "@/constants/github";

/**
 * Same cap as a GitHub draft file. The commit body cannot carry a larger
 * video, and this route does not transcode.
 */
export const MAX_CONTENT_VIDEO_BYTES = GITHUB_CONTENT_MAX_SINGLE_ASSET_BYTES;

export const CONTENT_VIDEO_MIME_EXTENSIONS = {
  "video/mp4": "mp4",
  "video/webm": "webm",
} as const;

export type ContentVideoMimeType = keyof typeof CONTENT_VIDEO_MIME_EXTENSIONS;
