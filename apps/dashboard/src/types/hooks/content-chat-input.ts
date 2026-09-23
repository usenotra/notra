import type {
  ChatAttachment,
  ContextItem,
  TextSelection,
} from "@notra/ai/types/chat";
import type {
  ChangeEvent,
  ClipboardEvent,
  DragEvent,
  KeyboardEvent,
  RefObject,
} from "react";

import type { QueuedMessage } from "@/components/chat/chat-queue";
import type { ChatContextOption } from "@/types/components/chat-input";
import type { PendingChatUpload } from "@/types/hooks/chat-composer-attachments";
import type { SkillSlashOption } from "@/types/skills/slash";

export interface ContentChatInputChrome {
  contextPickerDisabledReason: string | null;
  hasAttachmentChips: boolean;
  hasContextChips: boolean;
  isEmpty: boolean;
  isInputLocked: boolean;
  sendDisabled: boolean;
  sendLabel: string;
  sendTooltip: string;
  showComposerNudge: boolean;
  showStop: boolean;
}

export interface UseContentChatInputResult extends ContentChatInputChrome {
  acceptedFileTypesLabel: string;
  allowedChatMimeTypes: readonly string[];
  attachments: ChatAttachment[];
  attachmentTooltipText: string;
  connectedTop: boolean;
  context: ContextItem[];
  contextOptions: ChatContextOption[];
  contextPickerId: string;
  dragHandlers: {
    onDragEnter: (event: DragEvent<HTMLElement>) => void;
    onDragLeave: (event: DragEvent<HTMLElement>) => void;
    onDragOver: (event: DragEvent<HTMLElement>) => void;
    onDrop: (event: DragEvent<HTMLElement>) => void;
  };
  fileInputRef: RefObject<HTMLInputElement | null>;
  filteredSkills: SkillSlashOption[];
  handlePaste: (event: ClipboardEvent<HTMLTextAreaElement>) => void;
  handleSend: () => void;
  insertSlashSkill: (skill: SkillSlashOption) => void;
  isSlashMenuOpen: boolean;
  closeSlashMenu: () => void;
  isContextPickerOpen: boolean;
  isDraggingFile: boolean;
  isInContext: (item: ContextItem) => boolean;
  isLoading: boolean;
  isUploading: boolean;
  onAttach: () => void;
  onClearSelection?: () => void;
  onEditQueued?: (message: QueuedMessage) => void;
  onComposerKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  onComposerSelect: () => void;
  onComposerValueChange: (value: string, cursor: number) => void;
  onFileInputChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemoveContext?: (item: ContextItem) => void;
  onRemoveQueued?: (id: string) => void;
  onStop?: () => void;
  organizationSlug?: string;
  placeholder?: string;
  pendingUploads: PendingChatUpload[];
  previewAttachment: ChatAttachment | null;
  queuedMessages: QueuedMessage[];
  remainingChatCredits: number | null;
  removeAttachment: (key: string) => void;
  resizeTextarea: () => void;
  selection?: TextSelection | null;
  setIsContextPickerOpen: (open: boolean) => void;
  setIsFocused: (focused: boolean) => void;
  setPreviewAttachment: (attachment: ChatAttachment | null) => void;
  setValue: (value: string) => void;
  shouldShowLowCredits: boolean;
  skillCount: number;
  slashIndex: number;
  slashListRef: RefObject<HTMLDivElement | null>;
  taggedSkills: SkillSlashOption[];
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  toggleContextItem: (item: ContextItem, inContext: boolean) => void;
  untagSkill: (name: string) => void;
  usageLimitError: string | null;
  value: string;
}
