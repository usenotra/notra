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
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@notra/ui/components/shared/responsive-dialog";
import { cn } from "@notra/ui/lib/utils";
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
  useSyncExternalStore,
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

function subscribeToDesktopBreakpoint(onStoreChange: () => void) {
  const mediaQuery = window.matchMedia("(min-width: 64rem)");
  mediaQuery.addEventListener("change", onStoreChange);

  return () => mediaQuery.removeEventListener("change", onStoreChange);
}

const getDesktopBreakpointSnapshot = () =>
  window.matchMedia("(min-width: 64rem)").matches;
const getServerDesktopBreakpointSnapshot = () => false;

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
  const onCloseRef = useRef(onClose);
  const closeAfterNavigationRef = useRef(false);
  const { projectId: activeProjectId, isResolved: isProjectResolved } =
    useActiveProject();

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
  const sessions = (sessionsQuery.data ?? []).filter(
    (session) =>
      !session.externalChannelId || session.externalChannelId.source === "agent"
  );

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `/api/organizations/${organizationId}/chat`,
        prepareSendMessagesRequest: ({ messages, body }) => ({
          body: {
            ...body,
            chatId: activeChatId,
            projectId:
              isProjectResolved && activeProjectId
                ? activeProjectId
                : undefined,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            messages,
            surface: "dashboard-agent",
          },
        }),
        fetch: async (input, init) => {
          const triggerResponse = await fetch(input, init);
          if (!triggerResponse.ok) {
            return triggerResponse;
          }

          const contentType = triggerResponse.headers.get("content-type") ?? "";
          if (contentType.includes("text/event-stream")) {
            return triggerResponse;
          }

          return fetch(
            `/api/organizations/${organizationId}/chat/${encodeURIComponent(activeChatId)}/stream`,
            {
              method: "GET",
              headers: init?.headers,
              credentials: init?.credentials,
              signal: init?.signal,
            }
          );
        },
      }),
    [activeChatId, activeProjectId, isProjectResolved, organizationId]
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
      Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["chat-sessions", organizationId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["chat-history", organizationId, activeChatId],
        }),
      ]).catch((invalidateError) => {
        console.error("Failed to refresh agent chat sessions", invalidateError);
      });
      isAgentBusyRef.current = false;
    },
    onError: (err) => {
      isAgentBusyRef.current = false;
      Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["chat-sessions", organizationId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["chat-history", organizationId, activeChatId],
        }),
      ]).catch((invalidateError) => {
        console.error("Failed to refresh agent chat sessions", invalidateError);
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
    onCloseRef.current = onClose;
  }, [onClose]);
  useLayoutEffect(() => {
    messagesRef.current = messages;
    isAgentBusyRef.current = isAgentBusy || isHydratingHistory;
  }, [isAgentBusy, isHydratingHistory, messages]);

  const handleSelectChat = async (chatId: string) => {
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
  };

  const handleNewChat = () => {
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
  };

  const handleApproveTool = (approvalId: string) => {
    addToolApprovalResponse({
      id: approvalId,
      approved: true,
    });
  };

  const handleDenyTool = (approvalId: string) => {
    addToolApprovalResponse({
      id: approvalId,
      approved: false,
      reason: "discard",
    });
  };

  const handleSend = async (instruction: string) => {
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
  };

  const handleStop = useCallback(
    () =>
      fetch(
        `/api/organizations/${organizationId}/chat/${encodeURIComponent(activeChatId)}/stop`,
        { method: "POST" }
      )
        .catch((stopError) => {
          console.error("Failed to stop dashboard agent response", stopError);
        })
        .finally(() => stop()),
    [activeChatId, organizationId, stop]
  );

  const handleSuggestionSelect = (prompt: string) => {
    setChatInputValue(prompt);
  };

  const handleOpenChat = () => {
    const hasConversation =
      messagesRef.current.length > 0 ||
      Boolean(
        sessionsQuery.data?.some((session) => session.chatId === activeChatId)
      );
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
  };

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
          onStop={handleStop}
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
  const { active, closePanel, expanded, hasOpened } = useRightPanel();
  const { activeOrganization } = useOrganizationsContext();
  const organizationId = activeOrganization?.id ?? "";
  const organizationSlug = activeOrganization?.slug ?? "";
  const isDesktop = useSyncExternalStore(
    subscribeToDesktopBreakpoint,
    getDesktopBreakpointSnapshot,
    getServerDesktopBreakpointSnapshot
  );
  const open = active === "agent";

  if (!organizationId) {
    return null;
  }

  const chat = hasOpened.agent ? (
    <div className="h-full min-h-0 max-w-full min-w-0">
      <DashboardAgentChat
        key={organizationId}
        onClose={() => closePanel("agent")}
        organizationId={organizationId}
        organizationSlug={organizationSlug}
      />
    </div>
  ) : null;

  if (isDesktop) {
    return <RightPanel id="agent">{chat}</RightPanel>;
  }

  return (
    <ResponsiveDialog
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          closePanel("agent");
        }
      }}
      open={open}
    >
      <ResponsiveDialogContent
        className={cn(
          "flex flex-col gap-0 overflow-hidden p-0",
          expanded
            ? "h-svh max-h-svh max-w-none rounded-none sm:max-w-none"
            : "h-[85svh] max-h-[85svh] sm:max-w-md"
        )}
        drawerClassName={cn(
          "[&>*:not([data-slot=sheet-header]):not([data-slot=sheet-footer]):not([data-slot=sheet-close])]:px-0",
          expanded && "h-svh max-h-svh rounded-none"
        )}
        keepMounted
        showCloseButton={false}
      >
        <ResponsiveDialogHeader className="sr-only">
          <ResponsiveDialogTitle>{DASHBOARD_AGENT_TITLE}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Chat with your dashboard agent.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        {chat}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
