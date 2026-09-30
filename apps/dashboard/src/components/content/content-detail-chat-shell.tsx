"use client";

import type {
  ChatAttachment,
  ChatSessionSummary,
  ContextItem,
  TextSelection,
} from "@notra/ai/types/chat";
import type { ChatStatus, UIMessage } from "ai";

import ChatInput from "@/components/chat-input";
import type { QueuedMessage } from "@/components/chat/chat-queue";
import { ContentChatActivityPanel } from "@/components/content/content-chat-activity-panel";
import { RightPanel } from "@/components/dashboard/right-panel";

export interface ContentDetailChatComposerProps {
  context: ContextItem[];
  disabled: boolean;
  error: string | null;
  isLoading: boolean;
  onAddContext: (item: ContextItem) => void;
  onClearError: () => void;
  onClearSelection: () => void;
  onEditQueued: (message: QueuedMessage) => void;
  onRemoveContext: (item: ContextItem) => void;
  onRemoveQueued: (id: string) => void;
  onSteerQueued: (message: QueuedMessage) => void;
  onSend: (
    instruction: string,
    attachments?: ChatAttachment[]
  ) => Promise<void>;
  onStop: () => void;
  onValueChange: (value: string) => void;
  organizationId: string;
  organizationSlug: string;
  placeholder?: string;
  queuedMessages: QueuedMessage[];
  selection: TextSelection | null;
  value: string;
}

function ContentDetailChatComposer(props: ContentDetailChatComposerProps) {
  return <ChatInput {...props} />;
}

interface ContentDetailFloatingChatProps extends ContentDetailChatComposerProps {
  sidebarOffsetClass: string;
  hideOnLargeScreens: boolean;
}

export function ContentDetailFloatingChat({
  sidebarOffsetClass,
  hideOnLargeScreens,
  ...composerProps
}: ContentDetailFloatingChatProps) {
  return (
    <div
      className={`fixed right-0 bottom-0 left-0 mx-auto w-full max-w-2xl px-4 pb-4 md:w-auto ${sidebarOffsetClass} ${hideOnLargeScreens ? "lg:hidden" : ""}`}
    >
      <ContentDetailChatComposer {...composerProps} />
    </div>
  );
}

interface ContentDetailChatPanelProps {
  activeChatId: string | null;
  isHistoryLoading: boolean;
  messages: UIMessage[];
  onClose: () => void;
  onNewChat: () => void;
  onSelectChat: (chatId: string) => void;
  sessions: ChatSessionSummary[];
  status: ChatStatus;
  composer: ContentDetailChatComposerProps;
}

export function ContentDetailChatPanel({
  composer,
  ...panelProps
}: ContentDetailChatPanelProps) {
  return (
    <RightPanel id="content">
      <ContentChatActivityPanel
        {...panelProps}
        organizationSlug={composer.organizationSlug}
      >
        <div className="shrink-0 p-2 pt-1">
          <ContentDetailChatComposer {...composer} />
        </div>
      </ContentChatActivityPanel>
    </RightPanel>
  );
}
