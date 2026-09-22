import type { ChatAttachment, ChatMessagePart } from "@notra/ai/types/chat";

export function buildUserMessageParts(
  text: string,
  attachments: ChatAttachment[] = []
): ChatMessagePart[] {
  const parts: ChatMessagePart[] = [];
  if (text.length > 0) {
    parts.push({ type: "text", text });
  }
  for (const attachment of attachments) {
    parts.push({
      type: "file",
      url: attachment.url,
      mediaType: attachment.mediaType,
      filename: attachment.filename,
    });
  }
  return parts;
}

export function getChatFilePartFields(part: object) {
  return {
    url: "url" in part && typeof part.url === "string" ? part.url : "",
    mediaType:
      "mediaType" in part && typeof part.mediaType === "string"
        ? part.mediaType
        : "",
    filename:
      "filename" in part && typeof part.filename === "string"
        ? part.filename
        : undefined,
  };
}
