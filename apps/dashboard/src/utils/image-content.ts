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

/** URL of the editable Excalidraw scene saved for diagram images. */
export function getImageExcalidrawUrl(
  content: ImageContentData
): string | null {
  const metadata = content.sourceMetadata;
  if (
    typeof metadata === "object" &&
    metadata !== null &&
    "excalidrawUrl" in metadata &&
    typeof metadata.excalidrawUrl === "string" &&
    HTTP_URL_RE.test(metadata.excalidrawUrl)
  ) {
    return metadata.excalidrawUrl;
  }
  return null;
}
