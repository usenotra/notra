"use client";

import {
  ArrowShrink01Icon,
  Cancel01Icon,
  Clock01Icon,
  FullScreenIcon,
  PlusSignIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@notra/ui/components/ai-elements/message";
import { BrailleLoader } from "@notra/ui/components/shared/braille-loader";
import { Button } from "@notra/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@notra/ui/components/ui/dropdown-menu";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@notra/ui/components/ui/message-scroller";
import { getToolName, isToolUIPart } from "ai";
import { Fragment, type ReactNode } from "react";

import { ChatEmptyDither } from "@/components/ai/chat-empty-dither";
import { ChatReasoningBlock } from "@/components/ai/chat-reasoning-block";
import { ChatToolBlock } from "@/components/ai/chat-tool-block";
import { ChatInputContextRow } from "@/components/chat/chat-input-context-row";
import { useRightPanel } from "@/components/dashboard/right-panel-context";
import type {
  ContentChatActivityMessageProps,
  ContentChatActivityPanelProps,
} from "@/types/components/content-chat-activity-panel";
import { parseCreatedPostId } from "@/utils/chat-tool-draft";
import {
  getContentChatAttachments,
  hasContentChatAttachments,
} from "@/utils/content-chat-attachments";
import { getContentChatHistoryGroups } from "@/utils/content-chat-history";

const ACTIVITY_MESSAGE_CLASSNAME =
  "translate-y-0 opacity-100 transition-[opacity,translate] duration-fast ease-emphasized starting:translate-y-1 starting:opacity-0 motion-reduce:transition-none motion-reduce:starting:translate-y-0 motion-reduce:starting:opacity-100";

function ContentChatActivityFeed({
  children,
  scrollKey,
  showDither,
}: {
  children: ReactNode;
  scrollKey: string;
  showDither: boolean;
}) {
  return (
    <MessageScrollerProvider autoScroll key={scrollKey}>
      <MessageScroller className="relative min-h-0 min-w-0 flex-1 overflow-x-clip">
        {showDither ? <ChatEmptyDither /> : null}
        <MessageScrollerViewport className="min-w-0 overflow-x-hidden">
          <MessageScrollerContent className="min-w-0 gap-4 px-4 pt-4 pb-4">
            {children}
          </MessageScrollerContent>
        </MessageScrollerViewport>
        <MessageScrollerButton />
      </MessageScroller>
    </MessageScrollerProvider>
  );
}

function ContentChatActivityMessage({
  message,
  status,
  organizationSlug,
  onApproveTool,
  onDenyTool,
}: ContentChatActivityMessageProps) {
  const attachments =
    message.role === "user"
      ? getContentChatAttachments(message.metadata)
      : { selection: null, context: [] };
  const showAttachments = hasContentChatAttachments(attachments);

  return (
    <div className={ACTIVITY_MESSAGE_CLASSNAME}>
      <Message from={message.role}>
        {showAttachments ? (
          <div
            aria-label="Attached context"
            className="ml-auto flex max-w-full flex-wrap justify-end gap-1.5"
          >
            <ChatInputContextRow
              context={attachments.context}
              selection={attachments.selection}
            />
          </div>
        ) : null}
        <MessageContent>
          {message.parts.map((part, index) => {
            const key = `${message.id}-${index}`;

            if (part.type === "text") {
              if (!part.text.trim()) {
                return null;
              }
              return <MessageResponse key={key}>{part.text}</MessageResponse>;
            }

            if (part.type === "reasoning") {
              if (!part.text.trim()) {
                return null;
              }
              return (
                <ChatReasoningBlock
                  isStreaming={
                    status === "streaming" && part.state === "streaming"
                  }
                  key={key}
                >
                  {part.text}
                </ChatReasoningBlock>
              );
            }

            if (isToolUIPart(part)) {
              const approvalId =
                part.state === "approval-requested"
                  ? part.approval?.id
                  : undefined;
              const postId = parseCreatedPostId(part.output);
              return (
                <ChatToolBlock
                  editorHref={
                    organizationSlug && postId
                      ? `/${organizationSlug}/content/${postId}`
                      : undefined
                  }
                  input={part.input}
                  key={part.toolCallId}
                  onApprove={
                    approvalId && onApproveTool
                      ? () => onApproveTool(approvalId)
                      : undefined
                  }
                  onDeny={
                    approvalId && onDenyTool
                      ? () => onDenyTool(approvalId)
                      : undefined
                  }
                  output={part.output}
                  state={part.state}
                  toolCallId={part.toolCallId}
                  toolName={getToolName(part)}
                />
              );
            }

            return null;
          })}
        </MessageContent>
      </Message>
    </div>
  );
}

export function ContentChatActivityPanel({
  children,
  messages,
  sessions,
  activeChatId,
  isHistoryLoading,
  status,
  organizationSlug,
  onNewChat,
  onSelectChat,
  onClose,
  onOpenChat,
  showHistory = true,
  onApproveTool,
  onDenyTool,
  title = "Content Agent",
}: ContentChatActivityPanelProps) {
  const { expanded, toggleExpanded } = useRightPanel();
  const opensInChat = Boolean(onOpenChat);
  const historyGroups = showHistory
    ? getContentChatHistoryGroups(sessions)
    : [];
  const isAgentBusy = status === "streaming" || status === "submitted";
  const lastMessage = messages.at(-1);
  const lastAssistantHasNoVisibleContent =
    lastMessage?.role === "assistant" &&
    !lastMessage.parts.some(
      (part) =>
        (part.type === "text" && Boolean(part.text.trim())) ||
        (part.type === "reasoning" && Boolean(part.text.trim())) ||
        isToolUIPart(part)
    );
  const showThinkingIndicator =
    isAgentBusy &&
    (lastMessage?.role === "user" || lastAssistantHasNoVisibleContent);
  const visibleMessages =
    showThinkingIndicator && lastAssistantHasNoVisibleContent
      ? messages.slice(0, -1)
      : messages;
  const lastUserMessageId = [...visibleMessages]
    .reverse()
    .find((message) => message.role === "user")?.id;

  return (
    <div className="flex h-full min-h-0 max-w-full min-w-0 flex-col">
      <header className="bg-muted flex h-12 shrink-0 items-center justify-between gap-2 rounded-t-[calc(0.75rem-1px)] px-4">
        <h2 className="text-foreground flex h-full min-w-0 items-center truncate text-sm leading-none">
          {title}
        </h2>
        <div className="-mr-1.5 flex h-full items-center gap-0.5">
          <Button
            disabled={isAgentBusy}
            onClick={onNewChat}
            size="icon-sm"
            variant="ghost"
          >
            <span className="sr-only">Start a new chat</span>
            <HugeiconsIcon
              className="size-4"
              icon={PlusSignIcon}
              strokeWidth={1.8}
            />
          </Button>
          {showHistory ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                className="inline-flex"
                disabled={isAgentBusy}
                render={<Button size="icon-sm" variant="ghost" />}
              >
                <span className="sr-only">Open chat history</span>
                <HugeiconsIcon
                  className="size-4"
                  icon={Clock01Icon}
                  strokeWidth={1.8}
                />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="max-h-72 w-52"
                sideOffset={6}
              >
                {isHistoryLoading ? (
                  <p className="text-muted-foreground px-2 py-1.5 text-center text-xs">
                    Loading chats...
                  </p>
                ) : null}
                {!isHistoryLoading && sessions.length === 0 ? (
                  <p className="text-muted-foreground px-2 py-1.5 text-center text-xs">
                    No previous chats
                  </p>
                ) : null}
                {!isHistoryLoading && sessions.length > 0
                  ? historyGroups.map((group, groupIndex) => (
                      <Fragment key={group.label}>
                        {groupIndex > 0 ? <DropdownMenuSeparator /> : null}
                        <DropdownMenuGroup>
                          <DropdownMenuLabel>{group.label}</DropdownMenuLabel>
                          {group.sessions.map((session) => (
                            <DropdownMenuItem
                              className="data-[active=true]:bg-accent/70"
                              data-active={activeChatId === session.chatId}
                              disabled={isAgentBusy}
                              key={session.chatId}
                              onClick={() => onSelectChat(session.chatId)}
                              title={session.title}
                            >
                              <span className="min-w-0 flex-1 truncate">
                                {session.title}
                              </span>
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuGroup>
                      </Fragment>
                    ))
                  : null}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="gap-2"
                  disabled={isAgentBusy}
                  onClick={onNewChat}
                >
                  <HugeiconsIcon
                    className="size-4 shrink-0"
                    icon={PlusSignIcon}
                    strokeWidth={1.8}
                  />
                  <span>New chat</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
          <Button
            aria-pressed={opensInChat ? undefined : expanded}
            className="cursor-pointer"
            onClick={onOpenChat ?? toggleExpanded}
            size="icon-sm"
            variant="ghost"
          >
            <span className="sr-only">
              {opensInChat
                ? "Open in Chat"
                : expanded
                  ? `Exit fullscreen ${title}`
                  : `Open ${title} fullscreen`}
            </span>
            <HugeiconsIcon
              className="size-4"
              icon={
                opensInChat || !expanded ? FullScreenIcon : ArrowShrink01Icon
              }
              strokeWidth={1.8}
            />
          </Button>
          <Button
            className="cursor-pointer"
            onClick={onClose}
            size="icon-sm"
            variant="ghost"
          >
            <span className="sr-only">Close {title}</span>
            <HugeiconsIcon
              className="size-4"
              icon={Cancel01Icon}
              strokeWidth={1.8}
            />
          </Button>
        </div>
      </header>
      <div className="bg-muted flex min-h-0 flex-1 flex-col overflow-hidden rounded-b-[calc(0.75rem-1px)]">
        <div className="bg-background flex min-h-0 flex-1 flex-col rounded-t-xl">
          <ContentChatActivityFeed
            scrollKey={activeChatId ?? ""}
            showDither={visibleMessages.length === 0 && !showThinkingIndicator}
          >
            {visibleMessages.map((message) => (
              <MessageScrollerItem
                key={message.id}
                messageId={message.id}
                scrollAnchor={message.id === lastUserMessageId}
              >
                <ContentChatActivityMessage
                  message={message}
                  onApproveTool={onApproveTool}
                  onDenyTool={onDenyTool}
                  organizationSlug={organizationSlug}
                  status={status}
                />
              </MessageScrollerItem>
            ))}
            {showThinkingIndicator ? (
              <MessageScrollerItem
                className="[contain-intrinsic-size:none] [content-visibility:visible]"
                messageId="thinking"
                style={{ contentVisibility: "visible" }}
              >
                <BrailleLoader
                  className="text-muted-foreground text-sm"
                  label="Thinking"
                />
              </MessageScrollerItem>
            ) : null}
          </ContentChatActivityFeed>
          {children}
        </div>
      </div>
    </div>
  );
}
