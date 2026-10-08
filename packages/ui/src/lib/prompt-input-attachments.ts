import type { FileUIPart } from "ai";
import { nanoid } from "nanoid";

export function createPromptInputAttachments(files: File[]) {
  const attachments: (FileUIPart & { id: string })[] = [];

  try {
    for (const file of files) {
      attachments.push({
        id: nanoid(),
        type: "file",
        mediaType: file.type,
        filename: file.name,
        url: URL.createObjectURL(file),
      });
    }
    return attachments;
  } catch (error) {
    for (const attachment of attachments) {
      URL.revokeObjectURL(attachment.url);
    }
    throw error;
  }
}
