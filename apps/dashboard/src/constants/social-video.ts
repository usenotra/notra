import { ALLOWED_VIDEO_MIME_TYPES } from "@notra/schemas/constants/dashboard/upload";

import { MAX_CONTENT_VIDEO_BYTES } from "@/constants/content-video";

/**
 * Constraints for video attachments on X / LinkedIn posts.
 *
 * Capped at 10MB to match the server-enforced presigned `content` video
 * ceiling, the GitHub single asset ceiling, and what X / LinkedIn accept
 * without transcoding (no ffmpeg here) — platform rejections surface
 * through the delivery result instead.
 */
export const SOCIAL_VIDEO = {
  accept: ALLOWED_VIDEO_MIME_TYPES.join(","),
  /** Single video per post: X and LinkedIn accept at most one video. */
  maxCount: 1,
  /** Effective upload ceiling (matches server validation). */
  maxBytes: MAX_CONTENT_VIDEO_BYTES,
  maxBytesMb: MAX_CONTENT_VIDEO_BYTES / 1024 / 1024,
} as const;
