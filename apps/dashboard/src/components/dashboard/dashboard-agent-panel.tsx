"use client";

import { useChat } from "@ai-sdk/react";
import {
  chatSessionsListResponseSchema,
  uiMessageSchema,
} from "@notra/ai/schemas/chat";
import type { ChatSessionSummary } from "@notra/ai/types/chat";
import {
  dashboardAgentChatHistoryPath,
  dashboardAgentChatHistoryQueryKey,
  dashboardAgentChatSessionsPath,
  dashboardAgentChatSessionsQueryKey,
} from "@notra/ai/utils/chat";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DefaultChatTransport, isToolUIPart, type UIMessage } from "ai";
import { usePathname, useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

import ChatInput from "@/components/chat-input";
import { ChatSuggestions } from "@/components/chat/chat-suggestions";
import { ContentChatActivityPanel } from "@/components/content/content-chat-activity-panel";
import { RightPanel } from "@/components/dashboard/right-panel";
import { useRightPanel } from "@/components/dashboard/right-panel-context";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import { DASHBOARD_AGENT_SUGGESTIONS } from "@/constants/chat-suggestions";
import {
  DASHBOARD_AGENT_CHAT_ERROR_TOAST,
  DASHBOARD_AGENT_CHAT_PLACEHOLDER,
  DASHBOARD_AGENT_TITLE,
} from "@/constants/dashboard-agent";
import { localStorageKeys } from "@/constants/storage";
import { emitAutumnRefresh } from "@/lib/billing/autumn-refresh";
import { useActiveProject } from "@/lib/hooks/use-active-project";
import type { DashboardAgentChatProps } from "@/types/components/dashboard-agent";
import { shouldContinueAfterApprovalResponse } from "@/utils/chat-approvals";
import { handleStandaloneChatError } from "@/utils/chat-error";
import { dashboardAgentOpenChatPath } from "@/utils/dashboard-agent-chat-path";

function DashboardAgentChat({
  organizationId,
  organizationSlug,
  onClose,
}: DashboardAgentChatProps) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [chatInputValue, setChatInputValue] = useState("");
  const [chatError, setChatError] = useState<string | null>(null);
  const [activeChatId, setActiveChatId] = useState(() => crypto.randomUUID());
  const [isHydratingHistory, setIsHydratingHistory] = useState(false);
  const messagesRef = useRef<UIMessage[]>([]);
  const isAgentBusyRef = useRef(false);
  const activeChatIdRef = useRef(activeChatId);
  const onCloseRef = useRef(onClose);
  const closeAfterNavigationRef = useRef(false);
  onCloseRef.current = onClose;
  const projectIdRef = useRef<string | undefined>(undefined);
  const { projectId: activeProjectId, isResolved: isProjectResolved } =
    useActiveProject();
  activeChatIdRef.current = activeChatId;
  projectIdRef.current =
    isProjectResolved && activeProjectId ? activeProjectId : undefined;

  const sessionsQuery = useQuery<ChatSessionSummary[]>({
    queryKey: dashboardAgentChatSessionsQueryKey(organizationId),
    queryFn: async () => {
      const response = await fetch(
        dashboardAgentChatSessionsPath(organizationId)
      );
      if (!response.ok) {
        throw new Error("Failed to load agent chats");
      }
      const parsed = chatSessionsListResponseSchema.safeParse(
        await response.json()
      );
      if (!parsed.success) {
        throw new Error("Invalid agent chat sessions response");
      }
      return parsed.data.sessions ?? [];
    },
    staleTime: 60_000,
  });
  const sessions = sessionsQuery.data ?? [];

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `/api/organizations/${organizationId}/dashboard-agent/chat`,
        prepareSendMessagesRequest: ({ messages, body }) => ({
          body: {
            ...body,
            chatId: activeChatIdRef.current,
            projectId: projectIdRef.current,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            messages,
          },
        }),
      }),
    [organizationId]
  );

  const {
    messages,
    sendMessage,
    setMessages,
    status,
    stop,
    addToolApprovalResponse,
  } = useChat({
    transport,
    sendAutomaticallyWhen: shouldContinueAfterApprovalResponse,
    onFinish: () => {
      emitAutumnRefresh();
      if (activeChatId) {
        queryClient.setQueryData(
          dashboardAgentChatHistoryQueryKey(organizationId, activeChatId),
          messagesRef.current
        );
      }
      queryClient
        .invalidateQueries({
          queryKey: dashboardAgentChatSessionsQueryKey(organizationId),
        })
        .catch((invalidateError) => {
          console.error(
            "Failed to refresh agent chat sessions",
            invalidateError
          );
        });
      isAgentBusyRef.current = false;
    },
    onError: (err) => {
      isAgentBusyRef.current = false;
      queryClient
        .invalidateQueries({
          queryKey: dashboardAgentChatSessionsQueryKey(organizationId),
        })
        .catch((invalidateError) => {
          console.error(
            "Failed to refresh agent chat sessions",
            invalidateError
          );
        });
      queryClient
        .invalidateQueries({
          queryKey: dashboardAgentChatHistoryQueryKey(
            organizationId,
            activeChatId
          ),
        })
        .catch((invalidateError) => {
          console.error(
            "Failed to refresh agent chat history",
            invalidateError
          );
        });

      const { isUsageLimit } = handleStandaloneChatError(err, {
        setChatError,
      });
      if (!isUsageLimit) {
        toast.error(DASHBOARD_AGENT_CHAT_ERROR_TOAST);
      }
    },
  });

  const isAgentBusy = status === "streaming" || status === "submitted";
  useLayoutEffect(() => {
    messagesRef.current = messages;
    isAgentBusyRef.current = isAgentBusy || isHydratingHistory;
  }, [isAgentBusy, isHydratingHistory, messages]);

  const handleSelectChat = useCallback(
    async (chatId: string) => {
      if (isAgentBusyRef.current || chatId === activeChatId) {
        return;
      }
      isAgentBusyRef.current = true;
      setIsHydratingHistory(true);
      try {
        const history = await queryClient.fetchQuery({
          queryKey: dashboardAgentChatHistoryQueryKey(organizationId, chatId),
          queryFn: async () => {
            const response = await fetch(
              dashboardAgentChatHistoryPath(organizationId, chatId)
            );
            if (!response.ok) {
              throw new Error("Failed to load agent chat history");
            }
            const payload = await response.json();
            return uiMessageSchema.array().parse(payload?.messages);
          },
          staleTime: 0,
        });
        setChatInputValue("");
        setChatError(null);
        setMessages(history);
        setActiveChatId(chatId);
      } catch {
        toast.error("Failed to load agent chat history. Try again.");
      }
      setIsHydratingHistory(false);
      isAgentBusyRef.current = false;
    },
    [activeChatId, organizationId, queryClient, setMessages]
  );

  const handleNewChat = useCallback(() => {
    if (isAgentBusyRef.current) {
      return;
    }
    setChatInputValue("");
    setChatError(null);
    if (messagesRef.current.length === 0) {
      return;
    }
    setMessages([]);
    setActiveChatId(crypto.randomUUID());
  }, [setMessages]);

  const handleApproveTool = useCallback(
    (approvalId: string) => {
      addToolApprovalResponse({
        id: approvalId,
        approved: true,
      });
    },
    [addToolApprovalResponse]
  );

  const handleDenyTool = useCallback(
    (approvalId: string) => {
      addToolApprovalResponse({
        id: approvalId,
        approved: false,
        reason: "discard",
      });
    },
    [addToolApprovalResponse]
  );

  const handleSend = useCallback(
    async (instruction: string) => {
      if (!activeChatId || isAgentBusyRef.current) {
        return;
      }
      for (const message of messagesRef.current) {
        if (message.role !== "assistant") {
          continue;
        }
        for (const part of message.parts) {
          if (!(isToolUIPart(part) && part.state === "approval-requested")) {
            continue;
          }
          const approvalId = part.approval?.id;
          if (!approvalId) {
            continue;
          }
          addToolApprovalResponse({
            id: approvalId,
            approved: false,
            reason: "discard",
          });
        }
      }
      isAgentBusyRef.current = true;
      await sendMessage({ text: instruction });
    },
    [activeChatId, addToolApprovalResponse, sendMessage]
  );

  const handleSuggestionSelect = useCallback((prompt: string) => {
    setChatInputValue(prompt);
  }, []);

  const handleOpenChat = useCallback(() => {
    const hasConversation =
      messagesRef.current.length > 0 ||
      sessions.some((session) => session.chatId === activeChatId);
    const path = dashboardAgentOpenChatPath(organizationSlug, {
      chatId: activeChatId,
      hasConversation,
    });

    if (pathname === path) {
      onClose();
      return;
    }

    closeAfterNavigationRef.current = true;
    router.prefetch(path);
    router.push(path, { scroll: false });
  }, [activeChatId, onClose, organizationSlug, pathname, router, sessions]);

  useEffect(() => {
    if (!closeAfterNavigationRef.current) {
      return;
    }
    closeAfterNavigationRef.current = false;
    onCloseRef.current();
  }, [pathname]);

  const isChatDisabled = isHydratingHistory;
  const showExamplePrompts =
    messages.length === 0 && !isAgentBusy && !isHydratingHistory;

  return (
    <ContentChatActivityPanel
      activeChatId={activeChatId}
      isHistoryLoading={sessionsQuery.isPending || isHydratingHistory}
      messages={messages}
      onApproveTool={handleApproveTool}
      onClose={onClose}
      onDenyTool={handleDenyTool}
      onNewChat={handleNewChat}
      onOpenChat={handleOpenChat}
      onSelectChat={handleSelectChat}
      organizationSlug={organizationSlug}
      showHistory={false}
      sessions={sessions}
      status={status}
      title={DASHBOARD_AGENT_TITLE}
    >
      {showExamplePrompts ? (
        <div className="px-2">
          <ChatSuggestions
            disabled={isChatDisabled}
            dismissStorageKey={
              localStorageKeys.dashboardAgentSuggestionsDismissed
            }
            hidden={chatInputValue.trim().length > 0}
            layout="list"
            onSelect={handleSuggestionSelect}
            rotate
            suggestions={DASHBOARD_AGENT_SUGGESTIONS}
          />
        </div>
      ) : null}
      <div className="shrink-0 p-2 pt-1">
        <ChatInput
          disabled={isChatDisabled}
          error={chatError}
          isLoading={isAgentBusy}
          onClearError={() => setChatError(null)}
          onSend={handleSend}
          onStop={stop}
          onValueChange={setChatInputValue}
          organizationId={organizationId}
          organizationSlug={organizationSlug}
          placeholder={DASHBOARD_AGENT_CHAT_PLACEHOLDER}
          value={chatInputValue}
        />
      </div>
    </ContentChatActivityPanel>
  );
}

export function DashboardAgentHost() {
  const { closePanel } = useRightPanel();
  const { activeOrganization } = useOrganizationsContext();
  const organizationId = activeOrganization?.id ?? "";
  const organizationSlug = activeOrganization?.slug ?? "";

  if (!organizationId) {
    return null;
  }

  return (
    <RightPanel id="agent">
      <div className="h-full min-h-0">
        <DashboardAgentChat
          key={organizationId}
          onClose={() => closePanel("agent")}
          organizationId={organizationId}
          organizationSlug={organizationSlug}
        />
      </div>
    </RightPanel>
  );
}
