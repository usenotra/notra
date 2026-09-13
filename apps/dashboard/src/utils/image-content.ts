import { extractImageArtifactHtml } from "@notra/db/utils/post-image-artifacts";

import type { ImageContentData } from "@/types/content/image";

const HTTP_URL_RE = /^https?:\/\//i;
const GENERATED_IMAGE_PLACEHOLDER_PREFIX = "<p>Generated image:";

export const getImageArtifactHtml = extractImageArtifactHtml;

export function getImageExportHtml(content: ImageContentData): string | null {
  if (content.rawHtml?.trim()) {
    return content.rawHtml;
  }

  const persistedHtml = content.content.trim();
  if (
    persistedHtml.startsWith("<") &&
    !persistedHtml.startsWith(GENERATED_IMAGE_PLACEHOLDER_PREFIX)
  ) {
    return persistedHtml;
  }

  return extractImageArtifactHtml(content.sourceMetadata);
}

export function isHttpImageContent(content: string): boolean {
  return HTTP_URL_RE.test(content);
}
