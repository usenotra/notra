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
import { useCustomer } from "autumn-js/react";
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

import { ChatContextConnectSuggestions } from "@/components/chat/chat-context-connect-suggestions";
import { ChatContextOptionContent } from "@/components/chat/chat-context-option-content";
import { ChatInputContextRow } from "@/components/chat/chat-input-context-row";
import { Composer } from "@/components/composer/composer-shell";
import { useAutumnRefreshListener } from "@/lib/hooks/use-autumn-refresh-listener";
import { dashboardOrpc } from "@/lib/orpc/query";
import type {
  ChatInputProps,
  EnabledLinear,
  EnabledRepo,
} from "@/types/components/chat-input";
import { hasIncludedChatPlan } from "@/utils/chat-billing";
import {
  buildContentChatContextOptions,
  CHAT_INPUT_LIMIT_MESSAGE,
  contextItemsEqual,
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
  const { check, data: customer, refetch: refetchCustomer } = useCustomer();

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
    if (!trimmed || disabled) {
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

    onSend?.(trimmed);
    setValue("");
    requestAnimationFrame(resizeTextarea);
  }, [
    onSend,
    resizeTextarea,
    value,
    disabled,
    check,
    customer,
    chatIncludedInPlan,
    isUsageBlocked,
    clearError,
    setValue,
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
  const canQueue = isLoading && !isEmpty;
  const showStop = isLoading && isEmpty && Boolean(onStop);
  let contextPickerDisabledReason: string | null = null;
  if (isInputLocked) {
    contextPickerDisabledReason = "Context is unavailable right now.";
  }
  const hasQueuedChips = queuedMessages.length > 0;
  const hasContextChips =
    context.length > 0 || Boolean(selection) || hasQueuedChips;
  const showComposerNudge =
    hasContextChips || shouldShowLowCredits || Boolean(usageLimitError);
  let sendTooltip = "Enter to send. Shift+Enter for a new line.";
  if (showStop) {
    sendTooltip = "Stop generating";
  } else if (canQueue) {
    sendTooltip =
      "Enter to queue this message. It will send once the AI finishes.";
  }
  let sendLabel = "Send message";
  if (showStop) {
    sendLabel = "Stop generating";
  } else if (canQueue) {
    sendLabel = "Queue message";
  }

  return (
    <Composer.Frame
      connectedTop={connectedTop}
      nudge={
        showComposerNudge ? (
          <Composer.Nudge
            action={
              usageLimitError && organizationSlug ? (
                <Button
                  nativeButton={false}
                  render={
                    <Link href={`/${organizationSlug}/settings/billing`} />
                  }
                  size="xs"
                  variant="outline"
                >
                  Upgrade
                </Button>
              ) : null
            }
            title={
              shouldShowLowCredits && !hasContextChips && !usageLimitError
                ? `${remainingChatCredits} chat messages left`
                : undefined
            }
          >
            {hasContextChips ? (
              <>
                {queuedMessages.map((message) => (
                  <Composer.Chip
                    className="hover:border-border hover:bg-background w-full border-solid border-transparent bg-transparent transition-colors"
                    editLabel="Edit queued message"
                    key={message.id}
                    label={message.text}
                    labelClassName="min-w-0 flex-1 max-w-none"
                    onEdit={
                      onEditQueued ? () => onEditQueued(message) : undefined
                    }
                    onRemove={
                      onRemoveQueued
                        ? () => onRemoveQueued(message.id)
                        : undefined
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
        ) : null
      }
    >
      <div className="flex min-w-0 items-end gap-1 p-1.5">
        <Tooltip disabled={isContextPickerOpen}>
          <TooltipTrigger
            render={
              contextPickerDisabledReason ? (
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
            <Popover
              modal
              onOpenChange={setIsContextPickerOpen}
              open={isContextPickerOpen}
            >
              <PopoverTrigger
                render={
                  <Composer.ToolbarButton
                    aria-controls={contextPickerId}
                    aria-expanded={isContextPickerOpen}
                    aria-haspopup="listbox"
                    aria-label="Add tools or context"
                    className="size-7 justify-center px-0"
                    disabled={isInputLocked}
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
                        onSelect={() => setIsContextPickerOpen(false)}
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
                                toggleContextItem(
                                  option.contextItem,
                                  inContext
                                );
                                setIsContextPickerOpen(false);
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
                        onClick={() => setIsContextPickerOpen(false)}
                      >
                        Manage integrations
                      </Link>
                    </div>
                  ) : null}
                </Command>
              </PopoverContent>
            </Popover>
          </TooltipTrigger>
          <TooltipContent>
            {contextPickerDisabledReason ?? "Tools and context"}
          </TooltipContent>
        </Tooltip>
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
          disabled={isInputLocked || (!showStop && isEmpty)}
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
  );
};

export default ChatInput;
