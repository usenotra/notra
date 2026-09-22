"use client";

import { FEATURES } from "@notra/ai/billing/features";
import type { ContextItem } from "@notra/ai/types/chat";
import { useQuery } from "@tanstack/react-query";
import {
  type ClipboardEvent,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { useHotkeys } from "react-hotkeys-hook";

import { useAutumnRefreshListener } from "@/lib/hooks/use-autumn-refresh-listener";
import { useBillingCustomer } from "@/lib/hooks/use-billing-customer";
import { useChatComposerAttachments } from "@/lib/hooks/use-chat-composer-attachments";
import { dashboardOrpc } from "@/lib/orpc/query";
import type {
  ChatInputProps,
  EnabledLinear,
  EnabledRepo,
} from "@/types/components/chat-input";
import type { UseContentChatInputResult } from "@/types/hooks/content-chat-input";
import { hasIncludedChatPlan } from "@/utils/chat-billing";
import {
  buildContentChatContextOptions,
  CHAT_INPUT_LIMIT_MESSAGE,
  contextItemsEqual,
  getComposerValue,
  getContentChatInputChrome,
  getRemainingChatCredits,
  isChatUsageBlocked,
  nextValueAfterFilePaste,
  resolveUsageLimitError,
  shouldShowLowChatCredits,
} from "@/utils/chat-input";

export function useContentChatInput({
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
}: ChatInputProps): UseContentChatInputResult {
  const contextPickerId = useId();
  const [isFocused, setIsFocused] = useState(false);
  const [isContextPickerOpen, setIsContextPickerOpen] = useState(false);
  const [internalValue, setInternalValue] = useState("");
  const [internalError, setInternalError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const attachmentsState = useChatComposerAttachments();
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
  const remainingChatCredits = getRemainingChatCredits(
    checkResult?.balance?.remaining
  );
  const shouldShowLowCredits = shouldShowLowChatCredits(
    chatIncludedInPlan,
    remainingChatCredits
  );
  const isUsageBlocked = isChatUsageBlocked(
    checkResult?.allowed,
    chatIncludedInPlan
  );
  const usageLimitError = resolveUsageLimitError(
    externalError,
    internalError,
    isUsageBlocked
  );
  const clearError = useCallback(() => {
    setInternalError(null);
    onClearError?.();
  }, [onClearError]);
  const isControlled = controlledValue !== undefined;
  const value = getComposerValue(controlledValue, internalValue);
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
      enabled: Boolean(organizationId),
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

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    const hasAttachments =
      attachmentsState.attachments.length > 0 ||
      attachmentsState.pendingUploads.length > 0;
    if (disabled || attachmentsState.isUploading) {
      return;
    }
    if (!trimmed && attachmentsState.attachments.length === 0) {
      return;
    }
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

    const nextAttachments = attachmentsState.consumeAttachments();
    onSend?.(trimmed, nextAttachments);
    onClearSelection?.();
    setValue("");
    requestAnimationFrame(resizeTextarea);
  }, [
    attachmentsState,
    chatIncludedInPlan,
    check,
    clearError,
    customer,
    disabled,
    isLoading,
    isUsageBlocked,
    onClearSelection,
    onSend,
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

  const handlePaste = useCallback(
    (event: ClipboardEvent<HTMLTextAreaElement>) => {
      if (
        !attachmentsState.handlePasteFiles(
          Array.from(event.clipboardData.files)
        )
      ) {
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
    },
    [attachmentsState, setValue, value]
  );

  const chrome = getContentChatInputChrome({
    contextCount: context.length,
    disabled,
    hasReadyAttachments: attachmentsState.attachments.length > 0,
    hasSelection: Boolean(selection),
    isLoading,
    isUploading: attachmentsState.isUploading,
    isUsageBlocked,
    onStop,
    pendingUploadCount: attachmentsState.pendingUploads.length,
    queuedCount: queuedMessages.length,
    shouldShowLowCredits,
    usageLimitError,
    value,
  });

  return {
    ...chrome,
    acceptedFileTypesLabel: attachmentsState.acceptedFileTypesLabel,
    allowedChatMimeTypes: attachmentsState.allowedChatMimeTypes,
    attachments: attachmentsState.attachments,
    attachmentTooltipText: attachmentsState.attachmentTooltipText,
    connectedTop,
    context,
    contextOptions,
    contextPickerId,
    dragHandlers: attachmentsState.dragHandlers,
    fileInputRef: attachmentsState.fileInputRef,
    handlePaste,
    handleSend,
    isContextPickerOpen,
    isDraggingFile: attachmentsState.isDraggingFile,
    isLoading,
    isUploading: attachmentsState.isUploading,
    onClearSelection,
    onEditQueued,
    onFileInputChange: attachmentsState.onFileInputChange,
    onRemoveContext,
    onRemoveQueued,
    onStop,
    organizationSlug,
    placeholder,
    pendingUploads: attachmentsState.pendingUploads,
    previewAttachment: attachmentsState.previewAttachment,
    queuedMessages,
    remainingChatCredits,
    removeAttachment: attachmentsState.removeAttachment,
    resizeTextarea,
    selection,
    setIsContextPickerOpen,
    setIsFocused,
    setPreviewAttachment: attachmentsState.setPreviewAttachment,
    setValue,
    shouldShowLowCredits,
    textareaRef,
    toggleContextItem,
    usageLimitError,
    value,
    isInContext,
  };
}
