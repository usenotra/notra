"use client";

import {
  Alert02Icon,
  ArrowUp02Icon,
  AtIcon,
  StopIcon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { FEATURES } from "@notra/ai/billing/features";
import type { ContextItem } from "@notra/ai/types/chat";
import { Button } from "@notra/ui/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@notra/ui/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@notra/ui/components/ui/popover";
import { Textarea } from "@notra/ui/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { useHotkeys } from "react-hotkeys-hook";

import { AttachmentPreviewDialog } from "@/components/chat/attachment-preview";
import {
  ChatComposerAttachButton,
  ChatComposerAttachmentChips,
  ChatComposerDropOverlay,
} from "@/components/chat/chat-composer-attachments";
import { ChatContextConnectSuggestions } from "@/components/chat/chat-context-connect-suggestions";
import { ChatContextOptionContent } from "@/components/chat/chat-context-option-content";
import { ChatInputContextRow } from "@/components/chat/chat-input-context-row";
import { Composer } from "@/components/composer/composer-shell";
import { useAutumnRefreshListener } from "@/lib/hooks/use-autumn-refresh-listener";
import { useBillingCustomer } from "@/lib/hooks/use-billing-customer";
import { useChatComposerAttachments } from "@/lib/hooks/use-chat-composer-attachments";
import { dashboardOrpc } from "@/lib/orpc/query";
import type {
  ChatInputComposerNudgeProps,
  ChatInputContextPickerProps,
  ChatInputProps,
  EnabledLinear,
  EnabledRepo,
} from "@/types/components/chat-input";
import { hasIncludedChatPlan } from "@/utils/chat-billing";
import {
  buildContentChatContextOptions,
  CHAT_INPUT_LIMIT_MESSAGE,
  contextItemsEqual,
  getComposerSendChrome,
  nextValueAfterFilePaste,
} from "@/utils/chat-input";

const ChatInput = ({
  onSend,
  onStop,
  isLoading = false,
  disabled = false,
  selection,
  onClearSelection,
  organizationSlug,
  organizationId,
  context = [],
  onAddContext,
  onRemoveContext,
  value: controlledValue,
  onValueChange,
  error: externalError,
  onClearError,
  connectedTop = false,
  placeholder,
  queuedMessages = [],
  onEditQueued,
  onRemoveQueued,
}: ChatInputProps) => {
  const contextPickerId = useId();
  const [isFocused, setIsFocused] = useState(false);
  const [isContextPickerOpen, setIsContextPickerOpen] = useState(false);
  const [internalValue, setInternalValue] = useState("");
  const [internalError, setInternalError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const {
    acceptedFileTypesLabel,
    allowedChatMimeTypes,
    attachments,
    attachmentTooltipText,
    consumeAttachments,
    dragHandlers,
    fileInputRef,
    handlePasteFiles,
    isDraggingFile,
    isUploading,
    onFileInputChange,
    pendingUploads,
    previewAttachment,
    removeAttachment,
    setPreviewAttachment,
  } = useChatComposerAttachments();
  const {
    check,
    data: customer,
    refetch: refetchCustomer,
  } = useBillingCustomer();

  useAutumnRefreshListener(refetchCustomer);

  const checkResult = useMemo(() => {
    if (!customer) {
      return null;
    }
    return check({
      featureId: FEATURES.AI_CREDITS,
      requiredBalance: 1,
    });
  }, [check, customer]);
  const chatIncludedInPlan = hasIncludedChatPlan(customer);
  const remainingChatCredits =
    typeof checkResult?.balance?.remaining === "number"
      ? checkResult.balance.remaining
      : null;
  const shouldShowLowCredits =
    !chatIncludedInPlan &&
    remainingChatCredits !== null &&
    remainingChatCredits > 0 &&
    remainingChatCredits <= 10;
  const isUsageBlocked = checkResult?.allowed === false && !chatIncludedInPlan;
  const usageLimitError =
    externalError ??
    internalError ??
    (isUsageBlocked ? CHAT_INPUT_LIMIT_MESSAGE : null);
  const clearError = useCallback(() => {
    setInternalError(null);
    onClearError?.();
  }, [onClearError]);

  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : internalValue;
  const setValue = useCallback(
    (nextValue: string) => {
      if (isControlled) {
        onValueChange?.(nextValue);
        return;
      }

      setInternalValue(nextValue);
    },
    [isControlled, onValueChange]
  );

  const { data: integrationsData } = useQuery(
    dashboardOrpc.integrations.list.queryOptions({
      input: { organizationId: organizationId ?? "" },
      enabled: !!organizationId,
    })
  );

  const enabledRepos = useMemo(() => {
    const result: EnabledRepo[] = [];
    for (const integration of integrationsData?.integrations ?? []) {
      for (const repo of integration.repositories) {
        if (repo.enabled) {
          result.push({ ...repo, integrationId: integration.id });
        }
      }
    }
    return result;
  }, [integrationsData?.integrations]);

  const enabledLinear = useMemo(() => {
    const result: EnabledLinear[] = [];
    for (const integration of integrationsData?.integrations ?? []) {
      if (integration.type === "linear" && integration.enabled) {
        result.push({
          id: integration.id,
          displayName: integration.displayName,
          integrationId: integration.id,
          teamName:
            "linearTeamName" in integration
              ? (integration.linearTeamName as string | null)
              : null,
        });
      }
    }
    return result;
  }, [integrationsData?.integrations]);

  const contextOptions = useMemo(
    () =>
      buildContentChatContextOptions({
        enabledLinear,
        enabledRepos,
      }),
    [enabledLinear, enabledRepos]
  );

  const isInContext = useCallback(
    (item: ContextItem) =>
      context.some((contextItem) => contextItemsEqual(contextItem, item)),
    [context]
  );

  const resizeTextarea = useCallback(() => {
    const element = textareaRef.current;
    if (!element) {
      return;
    }
    element.style.height = "auto";
    const maxHeightRem = 12.5;
    const rootFontSize = Number.parseFloat(
      getComputedStyle(document.documentElement).fontSize
    );
    const maxHeightPx = maxHeightRem * rootFontSize;
    const nextHeightPx = Math.min(element.scrollHeight, maxHeightPx);
    element.style.height = `${nextHeightPx / rootFontSize}rem`;
    element.style.overflowY =
      element.scrollHeight > maxHeightPx ? "auto" : "hidden";
  }, []);

  const toggleContextItem = useCallback(
    (item: ContextItem, inContext: boolean) => {
      if (inContext) {
        onRemoveContext?.(item);
        return;
      }

      onAddContext?.(item);
    },
    [onAddContext, onRemoveContext]
  );

  useEffect(() => {
    if (isControlled) {
      requestAnimationFrame(resizeTextarea);
    }
  }, [isControlled, resizeTextarea]);

  const handleSend = useCallback(async () => {
    const trimmed = value.trim();
    const hasAttachments = attachments.length > 0 || pendingUploads.length > 0;
    if (disabled || isUploading) {
      return;
    }
    if (!trimmed && attachments.length === 0) {
      return;
    }
    // File messages stay in the composer until the current turn finishes.
    if (isLoading && hasAttachments) {
      return;
    }

    clearError();

    if (isUsageBlocked) {
      setInternalError(CHAT_INPUT_LIMIT_MESSAGE);
      return;
    }

    if (customer && !chatIncludedInPlan) {
      const sendCheckResult = check({
        featureId: FEATURES.AI_CREDITS,
        requiredBalance: 1,
      });

      if (sendCheckResult?.allowed === false) {
        setInternalError(CHAT_INPUT_LIMIT_MESSAGE);
        return;
      }
    }

    const nextAttachments = consumeAttachments();
    onSend?.(trimmed, nextAttachments);
    setValue("");
    requestAnimationFrame(resizeTextarea);
  }, [
    attachments.length,
    chatIncludedInPlan,
    check,
    clearError,
    consumeAttachments,
    customer,
    disabled,
    isLoading,
    isUploading,
    isUsageBlocked,
    onSend,
    pendingUploads.length,
    resizeTextarea,
    setValue,
    value,
  ]);

  useHotkeys(
    "enter",
    (event) => {
      if (event.shiftKey) {
        return;
      }
      event.preventDefault();
      handleSend();
    },
    {
      enableOnFormTags: ["TEXTAREA"],
      enabled: isFocused,
    },
    [handleSend, isFocused]
  );

  const isInputLocked = disabled || isUsageBlocked;
  const isEmpty = value.trim().length === 0;
  const hasAttachmentChips =
    attachments.length > 0 || pendingUploads.length > 0;
  const canQueue = isLoading && !isEmpty && !hasAttachmentChips;
  const showStop =
    isLoading && isEmpty && !hasAttachmentChips && Boolean(onStop);
  let contextPickerDisabledReason: string | null = null;
  if (isInputLocked) {
    contextPickerDisabledReason = "Context is unavailable right now.";
  }
  const hasQueuedChips = queuedMessages.length > 0;
  const hasContextChips =
    context.length > 0 || Boolean(selection) || hasQueuedChips;
  const showComposerNudge =
    hasContextChips ||
    hasAttachmentChips ||
    shouldShowLowCredits ||
    Boolean(usageLimitError);
  const { sendLabel, sendTooltip } = getComposerSendChrome(showStop, canQueue);

  return (
    <>
      {isDraggingFile ? (
        <ChatComposerDropOverlay
          acceptedFileTypesLabel={acceptedFileTypesLabel}
        />
      ) : null}
      <div {...dragHandlers}>
        <Composer.Frame
          connectedTop={connectedTop}
          nudge={
            showComposerNudge ? (
              <ChatInputComposerNudge
                attachments={attachments}
                context={context}
                hasAttachmentChips={hasAttachmentChips}
                hasContextChips={hasContextChips}
                onClearSelection={onClearSelection}
                onEditQueued={onEditQueued}
                onRemoveContext={onRemoveContext}
                onRemoveQueued={onRemoveQueued}
                organizationSlug={organizationSlug}
                pendingUploads={pendingUploads}
                queuedMessages={queuedMessages}
                remainingChatCredits={remainingChatCredits}
                removeAttachment={removeAttachment}
                selection={selection}
                setPreviewAttachment={setPreviewAttachment}
                shouldShowLowCredits={shouldShowLowCredits}
                usageLimitError={usageLimitError}
              />
            ) : null
          }
        >
          <div className="flex min-w-0 items-end gap-1 p-1.5">
            <input
              accept={allowedChatMimeTypes.join(",")}
              className="hidden"
              multiple
              onChange={onFileInputChange}
              ref={fileInputRef}
              type="file"
            />
            <ChatComposerAttachButton
              attachmentCount={attachments.length}
              disabled={isInputLocked || isLoading}
              fileInputRef={fileInputRef}
              pendingUploadCount={pendingUploads.length}
              tooltip={attachmentTooltipText}
            />
            <ChatInputContextPicker
              contextOptions={contextOptions}
              contextPickerId={contextPickerId}
              disabledReason={contextPickerDisabledReason}
              isInContext={isInContext}
              isOpen={isContextPickerOpen}
              onOpenChange={setIsContextPickerOpen}
              organizationSlug={organizationSlug}
              toggleContextItem={toggleContextItem}
            />
            <Textarea
              aria-label="Send a message"
              className="text-foreground caret-foreground block field-sizing-fixed max-h-50 min-h-7 w-full min-w-0 flex-1 resize-none overflow-hidden rounded-none border-0 bg-transparent px-1 py-1 text-sm leading-5 whitespace-pre-wrap shadow-none ring-0 outline-none focus-visible:border-transparent focus-visible:ring-0 disabled:cursor-not-allowed disabled:bg-transparent disabled:opacity-50 dark:bg-transparent dark:disabled:bg-transparent"
              disabled={isInputLocked}
              onBlur={() => setIsFocused(false)}
              onChange={(event) => {
                setValue(event.target.value);
              }}
              onFocus={() => setIsFocused(true)}
              onInput={resizeTextarea}
              onPaste={(event) => {
                if (!handlePasteFiles(Array.from(event.clipboardData.files))) {
                  return;
                }
                event.preventDefault();
                setValue(
                  nextValueAfterFilePaste(
                    value,
                    event.clipboardData.getData("text/plain"),
                    event.currentTarget.selectionStart,
                    event.currentTarget.selectionEnd
                  )
                );
              }}
              placeholder={
                isLoading
                  ? "Queue a message..."
                  : (placeholder ?? "Send a message...")
              }
              ref={textareaRef}
              rows={1}
              value={value}
            />
            <Composer.Send
              disabled={
                isInputLocked ||
                isUploading ||
                (!showStop && isEmpty && !hasAttachmentChips)
              }
              label={sendLabel}
              onClick={showStop ? onStop : handleSend}
              tooltip={sendTooltip}
            >
              <HugeiconsIcon
                className="size-4"
                icon={showStop ? StopIcon : ArrowUp02Icon}
                strokeWidth={2}
              />
            </Composer.Send>
          </div>
        </Composer.Frame>
      </div>
      <AttachmentPreviewDialog
        attachment={previewAttachment}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewAttachment(null);
          }
        }}
        open={previewAttachment !== null}
      />
    </>
  );
};

function ChatInputComposerNudge({
  attachments,
  context,
  hasAttachmentChips,
  hasContextChips,
  onClearSelection,
  onEditQueued,
  onRemoveContext,
  onRemoveQueued,
  organizationSlug,
  pendingUploads,
  queuedMessages,
  remainingChatCredits,
  removeAttachment,
  selection,
  setPreviewAttachment,
  shouldShowLowCredits,
  usageLimitError,
}: ChatInputComposerNudgeProps) {
  return (
    <Composer.Nudge
      action={
        usageLimitError && organizationSlug ? (
          <Button
            nativeButton={false}
            render={<Link href={`/${organizationSlug}/settings/billing`} />}
            size="xs"
            variant="outline"
          >
            Upgrade
          </Button>
        ) : null
      }
      title={
        shouldShowLowCredits &&
        !hasContextChips &&
        !hasAttachmentChips &&
        !usageLimitError
          ? `${remainingChatCredits} chat messages left`
          : undefined
      }
    >
      {hasContextChips || hasAttachmentChips ? (
        <>
          {queuedMessages.map((message) => (
            <Composer.Chip
              className="hover:border-border hover:bg-background w-full border-solid border-transparent bg-transparent transition-colors"
              editLabel="Edit queued message"
              key={message.id}
              label={message.text}
              labelClassName="min-w-0 flex-1 max-w-none"
              onEdit={onEditQueued ? () => onEditQueued(message) : undefined}
              onRemove={
                onRemoveQueued ? () => onRemoveQueued(message.id) : undefined
              }
              removeLabel="Remove from queue"
            />
          ))}
          <ChatInputContextRow
            context={context}
            onClearSelection={onClearSelection}
            onRemoveContext={onRemoveContext}
            selection={selection}
          />
          <ChatComposerAttachmentChips
            attachments={attachments}
            pendingUploads={pendingUploads}
            removeAttachment={removeAttachment}
            setPreviewAttachment={setPreviewAttachment}
          />
          {shouldShowLowCredits ? (
            <span className="text-muted-foreground text-xs">
              {remainingChatCredits} chat messages left
            </span>
          ) : null}
        </>
      ) : null}
      {usageLimitError ? (
        <span className="flex min-w-0 items-center gap-1.5 text-sm">
          <HugeiconsIcon
            className="text-warning size-4 shrink-0"
            icon={Alert02Icon}
          />
          <span className="truncate">{usageLimitError}</span>
        </span>
      ) : null}
    </Composer.Nudge>
  );
}

function ChatInputContextPicker({
  contextOptions,
  contextPickerId,
  disabledReason,
  isInContext,
  isOpen,
  onOpenChange,
  organizationSlug,
  toggleContextItem,
}: ChatInputContextPickerProps) {
  return (
    <Tooltip disabled={isOpen}>
      <TooltipTrigger
        render={
          disabledReason ? (
            // biome-ignore lint/a11y/useSemanticElements: a real button would illegally nest the disabled popover trigger button.
            <span
              aria-disabled="true"
              aria-label="Add tools or context"
              className="inline-flex size-7 shrink-0 cursor-not-allowed items-center justify-center"
              role="button"
              tabIndex={0}
            />
          ) : (
            <span className="inline-flex size-7 shrink-0 items-center justify-center" />
          )
        }
      >
        <Popover modal onOpenChange={onOpenChange} open={isOpen}>
          <PopoverTrigger
            render={
              <Composer.ToolbarButton
                aria-controls={contextPickerId}
                aria-expanded={isOpen}
                aria-haspopup="listbox"
                aria-label="Add tools or context"
                className="size-7 justify-center px-0"
                disabled={Boolean(disabledReason)}
                role="combobox"
              />
            }
          >
            <HugeiconsIcon className="size-4" icon={AtIcon} />
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="w-80 p-0"
            id={contextPickerId}
            showBackdrop
            sideOffset={6}
          >
            <Command>
              <CommandInput placeholder="Search tools and context..." />
              <CommandList>
                <CommandEmpty>
                  {contextOptions.length === 0
                    ? "No matching integrations."
                    : "No matching tools or context found."}
                </CommandEmpty>
                {contextOptions.length === 0 && organizationSlug ? (
                  <ChatContextConnectSuggestions
                    onSelect={() => onOpenChange(false)}
                    organizationSlug={organizationSlug}
                  />
                ) : null}
                {contextOptions.length > 0 ? (
                  <CommandGroup heading="Context">
                    {contextOptions.map((option) => {
                      const inContext = isInContext(option.contextItem);
                      return (
                        <CommandItem
                          data-checked={inContext}
                          key={option.id}
                          keywords={[option.searchText]}
                          onSelect={() => {
                            toggleContextItem(option.contextItem, inContext);
                            onOpenChange(false);
                          }}
                          value={option.id}
                        >
                          <ChatContextOptionContent option={option} />
                          {inContext ? (
                            <HugeiconsIcon
                              className="text-primary ml-auto size-3.5"
                              icon={Tick02Icon}
                            />
                          ) : null}
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                ) : null}
              </CommandList>
              {organizationSlug ? (
                <div className="border-border border-t p-1">
                  <Link
                    className="text-muted-foreground hover:bg-accent hover:text-accent-foreground flex items-center rounded-sm px-2 py-1.5 text-sm transition-colors outline-none"
                    href={`/${organizationSlug}/integrations`}
                    onClick={() => onOpenChange(false)}
                  >
                    Manage integrations
                  </Link>
                </div>
              ) : null}
            </Command>
          </PopoverContent>
        </Popover>
      </TooltipTrigger>
      <TooltipContent>{disabledReason ?? "Tools and context"}</TooltipContent>
    </Tooltip>
  );
}

export default ChatInput;
