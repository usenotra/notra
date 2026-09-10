import type { ChatSessionSummary } from "@notra/ai/types/chat";
import type { ChatStatus, UIMessage } from "ai";
import type { ReactNode } from "react";

export interface ContentChatActivityPanelProps {
  title?: string;
  messages: UIMessage[];
  sessions: ChatSessionSummary[];
  activeChatId: string | null;
  isHistoryLoading: boolean;
  status: ChatStatus;
  organizationSlug?: string;
  onNewChat: () => void;
  onSelectChat: (chatId: string) => void;
  onClose: () => void;
  onOpenChat?: () => void;
  onApproveTool?: (approvalId: string) => void;
  onDenyTool?: (approvalId: string) => void;
  children?: ReactNode;
}

export interface ContentChatActivityMessageProps {
  message: UIMessage;
  status: ChatStatus;
  organizationSlug?: string;
  onApproveTool?: (approvalId: string) => void;
  onDenyTool?: (approvalId: string) => void;
}
