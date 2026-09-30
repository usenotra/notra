import type { ChatAttachment } from "@notra/ai/types/chat";
import type { ChangeEvent, DragEvent, RefObject } from "react";

export interface PendingChatUpload {
  id: string;
  filename: string;
}

export interface UseChatComposerAttachmentsResult {
  acceptedFileTypesLabel: string;
  allowedChatMimeTypes: readonly string[];
  attachments: ChatAttachment[];
  attachmentTooltipText: string;
  consumeAttachments: () => ChatAttachment[];
  dragHandlers: {
    onDragEnter: (event: DragEvent<HTMLElement>) => void;
    onDragLeave: (event: DragEvent<HTMLElement>) => void;
    onDragOver: (event: DragEvent<HTMLElement>) => void;
    onDrop: (event: DragEvent<HTMLElement>) => void;
  };
  fileInputRef: RefObject<HTMLInputElement | null>;
  handleFilesSelected: (selected: FileList | File[]) => Promise<boolean>;
  handlePasteFiles: (files: File[]) => boolean;
  isDraggingFile: boolean;
  isUploading: boolean;
  onFileInputChange: (event: ChangeEvent<HTMLInputElement>) => void;
  pendingUploads: PendingChatUpload[];
  previewAttachment: ChatAttachment | null;
  removeAttachment: (key: string) => void;
  setPreviewAttachment: (attachment: ChatAttachment | null) => void;
}
