import { MAX_CONTENT_IMAGE_INPUT_BYTES } from "@/constants/content-image";
import { GITHUB_CONTENT_MAX_SINGLE_ASSET_BYTES } from "@/constants/github";

function megabytes(bytes: number) {
  return bytes / (1024 * 1024);
}

export function contentImageMaxBytes(mimeType: string) {
  if (mimeType === "image/gif" || mimeType === "image/avif") {
    return GITHUB_CONTENT_MAX_SINGLE_ASSET_BYTES;
  }
  return MAX_CONTENT_IMAGE_INPUT_BYTES;
}

export function guessContentImageMime(file: { name: string; type: string }) {
  if (file.type) {
    return file.type;
  }
  if (/\.gif$/i.test(file.name)) {
    return "image/gif";
  }
  if (/\.avif$/i.test(file.name)) {
    return "image/avif";
  }
  return "";
}

export function contentImageTooLargeMessage(mimeType: string) {
  const maxMb = megabytes(contentImageMaxBytes(mimeType));
  if (mimeType === "image/gif" || mimeType === "image/avif") {
    return `GIF and AVIF must be ${maxMb}MB or smaller`;
  }
  return `Image must be ${maxMb}MB or smaller`;
}

export function contentImageCompressedTooLargeMessage() {
  return `Image is still larger than ${megabytes(GITHUB_CONTENT_MAX_SINGLE_ASSET_BYTES)}MB after compression`;
}
