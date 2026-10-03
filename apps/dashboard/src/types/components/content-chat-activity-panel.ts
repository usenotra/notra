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
  showHistory?: boolean;
  onApproveTool?: (approvalId: string) => void;
  onDenyTool?: (approvalId: string) => void;
  children?: ReactNode;
}

export interface ContentChatActivityMessageProps {
  message: UIMessage;
  isLoading: boolean;
  elapsedSeconds?: number;
  organizationSlug?: string;
  onApproveTool?: (approvalId: string) => void;
  onDenyTool?: (approvalId: string) => void;
}

export type ContentChatActivityHeaderProps = Pick<
  ContentChatActivityPanelProps,
  | "title"
  | "sessions"
  | "activeChatId"
  | "isHistoryLoading"
  | "status"
  | "onNewChat"
  | "onSelectChat"
  | "onClose"
  | "onOpenChat"
  | "showHistory"
>;

export type ContentChatHistoryItemsProps = Pick<
  ContentChatActivityPanelProps,
  "sessions" | "activeChatId" | "isHistoryLoading" | "status" | "onSelectChat"
>;
