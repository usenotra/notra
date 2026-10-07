import type { DraggableSyntheticListeners } from "@dnd-kit/core";

import type { ChatAnnotationFocus } from "@/types/chat-annotations";
import type { ChatPostEntry } from "@/types/chat-posts";

export interface ChatContentPanelProps {
  /** An annotated passage to scroll to and flash in the active post. */
  focus?: ChatAnnotationFocus | null;
  /** Tool call ids of the open tabs, in tab order. */
  openToolCallIds: string[];
  activeToolCallId: string | null;
  onAskForChanges: (post: ChatPostEntry & { postId: string }) => void;
  onActivateTab: (toolCallId: string) => void;
  onCloseTab: (toolCallId: string) => void;
  onOpenTab: (toolCallId: string) => void;
  /** New tab order after a drag. */
  onReorderTabs: (toolCallIds: string[]) => void;
  organizationId: string;
  organizationSlug: string;
  posts: ChatPostEntry[];
}

export interface ChatContentPanelTabProps {
  isActive: boolean;
  onActivate: () => void;
  onClose: () => void;
  post: ChatPostEntry;
}

export interface ChatContentPanelTabSurfaceProps extends ChatContentPanelTabProps {
  /** Pointer listeners that start a drag from the tab body. */
  dragHandleProps?: DraggableSyntheticListeners;
  /** The copy that follows the pointer while dragging. */
  isOverlay?: boolean;
}

export interface ChatContentPanelDocumentProps {
  focus?: ChatAnnotationFocus;
  onAskForChanges: ChatContentPanelProps["onAskForChanges"];
  organizationId: string;
  organizationSlug: string;
  post: ChatPostEntry;
}
