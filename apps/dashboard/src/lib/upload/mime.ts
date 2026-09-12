import {
  ALLOWED_CHAT_MIME_TYPES,
  ALLOWED_OPENAI_CHAT_MIME_TYPES,
} from "@notra/schemas/constants/dashboard/upload";

const MIME_EXTENSION_MAP: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/svg+xml": "svg",
  "application/pdf": "pdf",
  "text/plain": "txt",
  "text/markdown": "md",
};

export function getFileExtension(fileType: string) {
  const normalizedMimeType = fileType.split(";")[0]?.trim().toLowerCase();
  if (!normalizedMimeType) {
    return "bin";
  }

  return MIME_EXTENSION_MAP[normalizedMimeType] ?? "bin";
}

export function getAllowedChatMimeTypes(model?: string) {
  return model === "openai/gpt-5.4"
    ? ALLOWED_OPENAI_CHAT_MIME_TYPES
    : ALLOWED_CHAT_MIME_TYPES;
}

export function isAllowedChatMimeType(fileType: string, model?: string) {
  return (getAllowedChatMimeTypes(model) as readonly string[]).includes(
    fileType
  );
}

export function isImageMimeType(mediaType: string): boolean {
  return mediaType.startsWith("image/");
}

export function isPdfMimeType(mediaType: string): boolean {
  return mediaType === "application/pdf";
}

export function isTextMimeType(mediaType: string): boolean {
  return mediaType === "text/plain" || mediaType === "text/markdown";
}
