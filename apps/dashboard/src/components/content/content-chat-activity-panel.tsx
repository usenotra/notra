"use client";

import {
  ArrowShrink01Icon,
  Cancel01Icon,
  Clock01Icon,
  FullScreenIcon,
  PlusSignIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { isTrustedChatFileUrl } from "@notra/ai/schemas/chat";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import { getToolName, isToolUIPart } from "ai";
import { Fragment, type ReactNode, useState } from "react";

import { ChatAssistantParts } from "@/components/ai/chat-assistant-parts";
import { ChatEmptyDither } from "@/components/ai/chat-empty-dither";
import { ChatToolBlock } from "@/components/ai/chat-tool-block";
import { isMcpToolName } from "@/components/ai/chat-tool-block/mcp/utils";
import { AssistantMetadataHover } from "@/components/chat/assistant-metadata-hover";
import { AttachmentPreviewDialog } from "@/components/chat/attachment-preview";
import { ChatImageAttachment } from "@/components/chat/chat-image-attachment";
import { ChatInputContextRow } from "@/components/chat/chat-input-context-row";
import { useRightPanel } from "@/components/dashboard/right-panel-context";
import { isImageMimeType } from "@/lib/upload/mime";
import type {
  ContentChatActivityMessageProps,
  ContentChatActivityPanelProps,
  ContentChatActivityHeaderProps,
  ContentChatHistoryItemsProps,
} from "@/types/components/content-chat-activity-panel";
import { getChatFilePartFields } from "@/utils/chat-message-parts";
import { parseCreatedPostId } from "@/utils/chat-tool-draft";
import {
  getContentChatAttachments,
  hasContentChatAttachments,
} from "@/utils/content-chat-attachments";
import { getContentChatHistoryGroups } from "@/utils/content-chat-history";
import { isContentEditorStandaloneTool } from "@/utils/content-editor-standalone-tool";
import { parseChatMessageMetadata } from "@/utils/parse-chat-message-metadata";

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

function renderContentChatToolPart({
  part,
  organizationSlug,
  onApproveTool,
  onDenyTool,
}: {
  part: Parameters<typeof getToolName>[0];
  organizationSlug?: string;
  onApproveTool?: (approvalId: string) => void;
  onDenyTool?: (approvalId: string) => void;
}) {
  const approvalId =
    part.state === "approval-requested" ? part.approval?.id : undefined;
  const toolName = getToolName(part);
  const output =
    part.state === "output-error" ? { error: part.errorText } : part.output;
  const postId = parseCreatedPostId(output);
  return (
    <ChatToolBlock
      editorHref={
        organizationSlug && postId
          ? `/${organizationSlug}/content/${postId}`
          : undefined
      }
      input={part.input}
      isMcp={isMcpToolName(toolName)}
      key={part.toolCallId}
      onApprove={
        approvalId && onApproveTool
          ? () => onApproveTool(approvalId)
          : undefined
      }
      onDeny={
        approvalId && onDenyTool ? () => onDenyTool(approvalId) : undefined
      }
      output={output}
      state={part.state}
      toolCallId={part.toolCallId}
      toolMetadata={
        part.type === "dynamic-tool" ? part.toolMetadata : undefined
      }
      toolName={toolName}
    />
  );
}

function ContentChatActivityMessage({
  message,
  isLoading,
  organizationSlug,
  onApproveTool,
  onDenyTool,
}: ContentChatActivityMessageProps) {
  const [previewAttachment, setPreviewAttachment] = useState<{
    url: string;
    filename: string;
    mediaType: string;
  } | null>(null);
  const attachments =
    message.role === "user"
      ? getContentChatAttachments(message.metadata)
      : { selection: null, context: [] };
  const showAttachments = hasContentChatAttachments(attachments);
  const assistantMetadata =
    message.role === "assistant"
      ? parseChatMessageMetadata(message.metadata)
      : undefined;
  const imageParts =
    message.role === "user"
      ? message.parts.filter(
          (part) =>
            part.type === "file" &&
            typeof part.mediaType === "string" &&
            isImageMimeType(part.mediaType)
        )
      : [];
  const fileParts =
    message.role === "user"
      ? message.parts.filter(
          (part) =>
            part.type === "file" &&
            (typeof part.mediaType !== "string" ||
              !isImageMimeType(part.mediaType))
        )
      : [];
  const hasBubbleContent =
    fileParts.length > 0 ||
    message.parts.some((part) => {
      if (part.type === "text" || part.type === "reasoning") {
        return Boolean(part.text.trim());
      }
      return isToolUIPart(part);
    });

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
        {imageParts.length > 0 ? (
          <div className="ml-auto flex max-w-full flex-col items-end gap-1.5">
            {imageParts.map((part, index) => {
              const { url, mediaType, filename } = getChatFilePartFields(part);
              if (!isTrustedChatFileUrl(url)) {
                return null;
              }
              return (
                <ChatImageAttachment
                  filename={filename}
                  key={`${message.id}-image-${index}`}
                  mediaType={mediaType}
                  onClick={() =>
                    setPreviewAttachment({
                      url,
                      filename: filename ?? "attachment",
                      mediaType,
                    })
                  }
                  url={url}
                />
              );
            })}
          </div>
        ) : null}
        {hasBubbleContent ? (
          <MessageContent>
            {message.role === "assistant" ? (
              <ChatAssistantParts
                durationMs={assistantMetadata?.generationDurationMs}
                isLoading={isLoading}
                isStandaloneTool={isContentEditorStandaloneTool}
                messageId={message.id}
                parts={message.parts}
                renderStandalone={(part, index) => {
                  if (part.type !== "text" || !part.text.trim()) {
                    return null;
                  }
                  return (
                    <MessageResponse key={`${message.id}-${index}`}>
                      {part.text}
                    </MessageResponse>
                  );
                }}
                renderTool={(part) =>
                  isToolUIPart(part)
                    ? renderContentChatToolPart({
                        part,
                        organizationSlug,
                        onApproveTool,
                        onDenyTool,
                      })
                    : null
                }
              />
            ) : (
              <>
                {message.parts.map((part, index) => {
                  if (part.type !== "text" || !part.text.trim()) {
                    return null;
                  }
                  return (
                    <MessageResponse key={`${message.id}-${index}`}>
                      {part.text}
                    </MessageResponse>
                  );
                })}
                {fileParts.length > 0 ? (
                  <div className="flex max-w-full flex-wrap justify-end gap-2">
                    {fileParts.map((part, index) => {
                      const { url, mediaType, filename } =
                        getChatFilePartFields(part);
                      if (!isTrustedChatFileUrl(url)) {
                        return null;
                      }
                      return (
                        <a
                          className="border-border bg-muted/40 text-foreground hover:bg-accent my-1 inline-flex max-w-full items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs no-underline transition-colors"
                          href={url}
                          key={`${message.id}-file-${index}`}
                          rel="noopener noreferrer"
                          target="_blank"
                        >
                          <span className="truncate">
                            {filename ?? mediaType ?? "Attachment"}
                          </span>
                        </a>
                      );
                    })}
                  </div>
                ) : null}
              </>
            )}
          </MessageContent>
        ) : null}
        {message.role === "assistant" ? (
          <AssistantMetadataHover metadata={assistantMetadata} />
        ) : null}
      </Message>
      <AttachmentPreviewDialog
        attachment={previewAttachment}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewAttachment(null);
          }
        }}
        open={previewAttachment !== null}
      />
    </div>
  );
}

function ContentChatHistoryItems({
  sessions,
  activeChatId,
  isHistoryLoading,
  status,
  onSelectChat,
}: ContentChatHistoryItemsProps) {
  if (isHistoryLoading) {
    return (
      <p className="text-muted-foreground px-2 py-1.5 text-center text-xs">
        Loading chats...
      </p>
    );
  }
  if (sessions.length === 0) {
    return (
      <p className="text-muted-foreground px-2 py-1.5 text-center text-xs">
        No previous chats
      </p>
    );
  }
  const isAgentBusy = status === "streaming" || status === "submitted";
  return getContentChatHistoryGroups(sessions).map((group, groupIndex) => (
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
            <span className="min-w-0 flex-1 truncate">{session.title}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuGroup>
    </Fragment>
  ));
}

function ContentChatActivityHeader({
  sessions,
  activeChatId,
  isHistoryLoading,
  status,
  onNewChat,
  onSelectChat,
  onClose,
  onOpenChat,
  showHistory = true,
  title = "Content Agent",
}: ContentChatActivityHeaderProps) {
  const { expanded, toggleExpanded } = useRightPanel();
  const opensInChat = Boolean(onOpenChat);
  const isAgentBusy = status === "streaming" || status === "submitted";
  return (
    <header className="bg-muted flex h-12 shrink-0 items-center justify-between gap-2 rounded-t-[calc(0.75rem-1px)] px-4">
      <h2 className="text-foreground flex h-full min-w-0 items-center truncate text-sm leading-none">
        {title}
      </h2>
      <div className="-mr-1.5 flex h-full items-center gap-0.5">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                disabled={isAgentBusy}
                onClick={onNewChat}
                size="icon-sm"
                variant="ghost"
              />
            }
          >
            <span className="sr-only">Start a new chat</span>
            <HugeiconsIcon
              className="size-4"
              icon={PlusSignIcon}
              strokeWidth={1.8}
            />
          </TooltipTrigger>
          <TooltipContent>New chat</TooltipContent>
        </Tooltip>
        {showHistory ? (
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger
                render={
                  <DropdownMenuTrigger
                    className="inline-flex"
                    disabled={isAgentBusy}
                    render={<Button size="icon-sm" variant="ghost" />}
                  />
                }
              >
                <span className="sr-only">Open chat history</span>
                <HugeiconsIcon
                  className="size-4"
                  icon={Clock01Icon}
                  strokeWidth={1.8}
                />
              </TooltipTrigger>
              <TooltipContent>Chat history</TooltipContent>
            </Tooltip>
            <DropdownMenuContent
              align="end"
              className="max-h-72 w-52"
              sideOffset={6}
            >
              <ContentChatHistoryItems
                sessions={sessions}
                activeChatId={activeChatId}
                isHistoryLoading={isHistoryLoading}
                status={status}
                onSelectChat={onSelectChat}
              />
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
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                aria-pressed={opensInChat ? undefined : expanded}
                className="cursor-pointer"
                onClick={onOpenChat ?? toggleExpanded}
                size="icon-sm"
                variant="ghost"
              />
            }
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
          </TooltipTrigger>
          <TooltipContent>
            {opensInChat
              ? "Open in Chat"
              : expanded
                ? "Exit fullscreen"
                : "Expand agent"}
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                className="cursor-pointer"
                onClick={onClose}
                size="icon-sm"
                variant="ghost"
              />
            }
          >
            <span className="sr-only">Close {title}</span>
            <HugeiconsIcon
              className="size-4"
              icon={Cancel01Icon}
              strokeWidth={1.8}
            />
          </TooltipTrigger>
          <TooltipContent>Close {title}</TooltipContent>
        </Tooltip>
      </div>
    </header>
  );
}

export function ContentChatActivityPanel(props: ContentChatActivityPanelProps) {
  const {
    children,
    messages,
    status,
    activeChatId,
    organizationSlug,
    onApproveTool,
    onDenyTool,
  } = props;
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
  const lastVisibleMessage = visibleMessages.at(-1);
  const lastAssistantMessageId =
    lastVisibleMessage?.role === "assistant"
      ? lastVisibleMessage.id
      : undefined;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ContentChatActivityHeader {...props} />
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
                  isLoading={
                    status === "streaming" &&
                    message.id === lastAssistantMessageId
                  }
                  message={message}
                  onApproveTool={onApproveTool}
                  onDenyTool={onDenyTool}
                  organizationSlug={organizationSlug}
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
