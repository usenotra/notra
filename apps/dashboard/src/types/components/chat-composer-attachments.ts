import type { ChatAttachment } from "@notra/ai/types/chat";
import type { RefObject } from "react";

import type { PendingChatUpload } from "@/types/hooks/chat-composer-attachments";

export interface ChatComposerAttachButtonProps {
  attachmentCount: number;
  disabled: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  pendingUploadCount: number;
  tooltip: string;
}

export interface ChatComposerDropOverlayProps {
  acceptedFileTypesLabel: string;
}

export interface ChatComposerAttachmentChipsProps {
  attachments: ChatAttachment[];
  pendingUploads: PendingChatUpload[];
  removeAttachment: (key: string) => void;
  setPreviewAttachment: (attachment: ChatAttachment) => void;
}
