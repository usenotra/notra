"use client";

import { FEATURES } from "@notra/ai/billing/features";
import type { ContextItem } from "@notra/ai/types/chat";
import { useQuery } from "@tanstack/react-query";
import {
  type ClipboardEvent,
  type KeyboardEvent,
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
import { useChatSkillSlash } from "@/lib/hooks/use-chat-skill-slash";
import { dashboardOrpc } from "@/lib/orpc/query";
import type {
  ChatInputProps,
  EnabledLinear,
  EnabledRepo,
} from "@/types/components/chat-input";
import type { UseContentChatInputResult } from "@/types/hooks/content-chat-input";
import type { SkillSlashOption } from "@/types/skills/slash";
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
import {
  applySlashSkill,
  handleSlashMenuKeyDown,
  prependTaggedSkills,
} from "@/utils/slash-skill-query";

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
  const pendingSlashCursorRef = useRef<number | null>(null);
  const {
    skills,
    filteredSkills,
    slashQuery,
    slashIndex,
    isSlashMenuOpen,
    slashListRef,
    closeSlashMenu,
    syncSlashQuery,
    moveSlashIndex,
    taggedSkills,
    tagSkill,
    untagSkill,
    clearTaggedSkills,
  } = useChatSkillSlash(organizationId);
  const taggedSkillNames = useMemo(
    () => taggedSkills.map((skill) => skill.name),
    [taggedSkills]
  );
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
  const chatIncludedInPlan = hasIncludedChatPlan(customer) === true;
  const remainingChatCredits = getRemainingChatCredits(
    checkResult?.balance?.remaining
  );
  const shouldShowLowCredits = shouldShowLowChatCredits(
    chatIncludedInPlan,
    remainingChatCredits
  );
  const isUsageBlocked =
    isChatUsageBlocked(checkResult?.allowed, chatIncludedInPlan) === true;
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

  const onComposerValueChange = useCallback(
    (nextValue: string, cursor: number) => {
      setValue(nextValue);
      syncSlashQuery(nextValue, cursor);
    },
    [setValue, syncSlashQuery]
  );

  const onComposerSelect = useCallback(() => {
    const element = textareaRef.current;
    if (!element) {
      return;
    }
    syncSlashQuery(element.value, element.selectionStart);
  }, [syncSlashQuery]);

  const insertSlashSkill = useCallback(
    (skill: SkillSlashOption) => {
      const element = textareaRef.current;
      if (!element || !slashQuery) {
        return;
      }

      const next = applySlashSkill(value, slashQuery, element.selectionStart);
      pendingSlashCursorRef.current = next.cursor;
      setValue(next.text);
      tagSkill(skill);
      closeSlashMenu();
    },
    [closeSlashMenu, setValue, slashQuery, tagSkill, value]
  );

  const onComposerKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      handleSlashMenuKeyDown(event, {
        isOpen: isSlashMenuOpen,
        matchCount: filteredSkills.length,
        onMove: moveSlashIndex,
        onSelect: () => {
          const selected = filteredSkills[slashIndex];
          if (selected) {
            insertSlashSkill(selected);
          }
        },
        onClose: closeSlashMenu,
      });
    },
    [
      closeSlashMenu,
      filteredSkills,
      insertSlashSkill,
      isSlashMenuOpen,
      moveSlashIndex,
      slashIndex,
    ]
  );

  useEffect(() => {
    const cursor = pendingSlashCursorRef.current;
    const element = textareaRef.current;
    if (cursor === null || !element) {
      return;
    }
    pendingSlashCursorRef.current = null;
    element.selectionStart = cursor;
    element.selectionEnd = cursor;
  }, [value]);

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
        if (integration.enabled && repo.enabled) {
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
    requestAnimationFrame(resizeTextarea);
  }, [resizeTextarea, value]);

  const handleSend = useCallback(() => {
    const trimmed = prependTaggedSkills(value, taggedSkillNames);
    const hasAttachments = attachments.length > 0 || pendingUploads.length > 0;
    if (disabled || isUploading) {
      return;
    }
    if (!trimmed && attachments.length === 0) {
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

    const nextAttachments = consumeAttachments();
    onSend?.(trimmed, nextAttachments);
    onClearSelection?.();
    closeSlashMenu();
    clearTaggedSkills();
    setValue("");
    requestAnimationFrame(resizeTextarea);
  }, [
    attachments.length,
    chatIncludedInPlan,
    check,
    clearError,
    clearTaggedSkills,
    closeSlashMenu,
    consumeAttachments,
    customer,
    disabled,
    isLoading,
    isUploading,
    isUsageBlocked,
    onClearSelection,
    onSend,
    pendingUploads.length,
    resizeTextarea,
    setValue,
    taggedSkillNames,
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
      enabled: isFocused && !(isSlashMenuOpen && filteredSkills.length > 0),
    },
    [handleSend, filteredSkills.length, isFocused, isSlashMenuOpen]
  );

  const handlePaste = useCallback(
    (event: ClipboardEvent<HTMLTextAreaElement>) => {
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
    },
    [handlePasteFiles, setValue, value]
  );

  const onAttach = useCallback(() => {
    fileInputRef.current?.click();
  }, [fileInputRef]);

  const chrome = getContentChatInputChrome({
    contextCount: context.length,
    disabled,
    hasReadyAttachments: attachments.length > 0,
    hasSelection: Boolean(selection),
    isLoading,
    isUploading,
    isUsageBlocked,
    onStop,
    pendingUploadCount: pendingUploads.length,
    queuedCount: queuedMessages.length,
    shouldShowLowCredits,
    skillTagCount: taggedSkills.length,
    usageLimitError,
    value,
  });

  return {
    ...chrome,
    acceptedFileTypesLabel,
    allowedChatMimeTypes,
    attachments,
    attachmentTooltipText,
    connectedTop,
    context,
    contextOptions,
    closeSlashMenu,
    contextPickerId,
    dragHandlers,
    fileInputRef,
    filteredSkills,
    handlePaste,
    handleSend,
    insertSlashSkill,
    isContextPickerOpen,
    isDraggingFile,
    isLoading,
    isUploading,
    onAttach,
    onClearSelection,
    onComposerKeyDown,
    onComposerSelect,
    onComposerValueChange,
    onEditQueued,
    onFileInputChange,
    onRemoveContext,
    onRemoveQueued,
    onStop,
    organizationSlug,
    placeholder,
    pendingUploads,
    previewAttachment,
    queuedMessages,
    remainingChatCredits,
    removeAttachment,
    resizeTextarea,
    selection,
    setIsContextPickerOpen,
    setIsFocused,
    setPreviewAttachment,
    setValue,
    shouldShowLowCredits,
    skillCount: skills.length,
    slashIndex,
    slashListRef,
    taggedSkills,
    textareaRef,
    toggleContextItem,
    untagSkill,
    usageLimitError,
    value,
    isInContext,
    isSlashMenuOpen,
  };
}
