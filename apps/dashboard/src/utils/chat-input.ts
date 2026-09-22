import type { ContextItem, TextSelection } from "@notra/ai/types/chat";

import type {
  ChatContextOption,
  EnabledLinear,
  EnabledRepo,
} from "@/types/components/chat-input";
import type { ContentChatInputChrome } from "@/types/hooks/content-chat-input";

export const CHAT_INPUT_LIMIT_MESSAGE = "No chat credits left.";

export function getRemainingChatCredits(remaining: unknown): number | null {
  if (typeof remaining === "number") {
    return remaining;
  }
  return null;
}

export function isChatUsageBlocked(
  allowed: boolean | undefined,
  chatIncludedInPlan: boolean
): boolean {
  return allowed === false && !chatIncludedInPlan;
}

export function shouldShowLowChatCredits(
  chatIncludedInPlan: boolean,
  remainingChatCredits: number | null
): boolean {
  return (
    !chatIncludedInPlan &&
    remainingChatCredits !== null &&
    remainingChatCredits > 0 &&
    remainingChatCredits <= 10
  );
}

export function resolveUsageLimitError(
  externalError: string | null | undefined,
  internalError: string | null,
  isUsageBlocked: boolean
): string | null {
  if (externalError) {
    return externalError;
  }
  if (internalError) {
    return internalError;
  }
  if (isUsageBlocked) {
    return CHAT_INPUT_LIMIT_MESSAGE;
  }
  return null;
}

export function getComposerValue(
  controlledValue: string | undefined,
  internalValue: string
): string {
  if (controlledValue !== undefined) {
    return controlledValue;
  }
  return internalValue;
}

export function getContentChatInputChrome({
  contextCount,
  disabled,
  hasReadyAttachments,
  hasSelection,
  isLoading,
  isUploading,
  isUsageBlocked,
  onStop,
  pendingUploadCount,
  queuedCount,
  shouldShowLowCredits,
  usageLimitError,
  value,
}: {
  contextCount: number;
  disabled: boolean;
  hasReadyAttachments: boolean;
  hasSelection: boolean;
  isLoading: boolean;
  isUploading: boolean;
  isUsageBlocked: boolean;
  onStop?: () => void;
  pendingUploadCount: number;
  queuedCount: number;
  shouldShowLowCredits: boolean;
  usageLimitError: string | null;
  value: string;
}): ContentChatInputChrome {
  const isEmpty = value.trim().length === 0;
  const hasAttachmentChips = hasReadyAttachments || pendingUploadCount > 0;
  const isInputLocked = disabled || isUsageBlocked;
  const canQueue = isLoading && !isEmpty && !hasAttachmentChips;
  const showStop =
    isLoading && isEmpty && !hasAttachmentChips && Boolean(onStop);
  const hasContextChips = contextCount > 0 || hasSelection || queuedCount > 0;
  const showComposerNudge =
    hasContextChips ||
    hasAttachmentChips ||
    shouldShowLowCredits ||
    Boolean(usageLimitError);
  const sendChrome = getComposerSendChrome(showStop, canQueue);
  return {
    contextPickerDisabledReason: isInputLocked
      ? "Context is unavailable right now."
      : null,
    hasAttachmentChips,
    hasContextChips,
    isEmpty,
    isInputLocked,
    sendDisabled:
      isInputLocked ||
      isUploading ||
      (!showStop && isEmpty && !hasAttachmentChips),
    sendLabel: sendChrome.sendLabel,
    sendTooltip: sendChrome.sendTooltip,
    showComposerNudge,
    showStop,
  };
}

export function getComposerSendChrome(showStop: boolean, canQueue: boolean) {
  if (showStop) {
    return {
      sendLabel: "Stop generating",
      sendTooltip: "Stop generating",
    };
  }
  if (canQueue) {
    return {
      sendLabel: "Queue message",
      sendTooltip:
        "Enter to queue this message. It will send once the AI finishes.",
    };
  }
  return {
    sendLabel: "Send message",
    sendTooltip: "Enter to send. Shift+Enter for a new line.",
  };
}

export function nextValueAfterFilePaste(
  current: string,
  clipboardText: string,
  selectionStart = current.length,
  selectionEnd = current.length
): string {
  if (!clipboardText.trim()) {
    return current;
  }
  const start = Math.min(Math.max(0, selectionStart), current.length);
  const end = Math.min(Math.max(start, selectionEnd), current.length);
  return `${current.slice(0, start)}${clipboardText}${current.slice(end)}`;
}

export function getSelectionPreview(selection: TextSelection) {
  return selection.text.length > 150
    ? `${selection.text.slice(0, 150)}...`
    : selection.text;
}

export function toGithubContextItem(repo: EnabledRepo): ContextItem {
  return {
    type: "github-repo",
    owner: repo.owner,
    repo: repo.repo,
    integrationId: repo.integrationId,
  };
}

export function contextItemsEqual(a: ContextItem, b: ContextItem): boolean {
  if (a.type !== b.type) {
    return false;
  }
  if (a.type === "github-repo" && b.type === "github-repo") {
    return a.owner === b.owner && a.repo === b.repo;
  }
  if (a.type === "linear-team" && b.type === "linear-team") {
    return a.integrationId === b.integrationId;
  }
  if (a.type === "mcp-server" && b.type === "mcp-server") {
    return a.integrationId === b.integrationId;
  }
  return false;
}

export function contextItemKey(item: ContextItem): string {
  if (item.type === "github-repo") {
    return `github:${item.integrationId}:${item.owner}/${item.repo}`;
  }
  return `${item.type}:${item.integrationId}`;
}

export function buildContentChatContextOptions({
  enabledRepos,
  enabledLinear,
}: {
  enabledRepos: EnabledRepo[];
  enabledLinear: EnabledLinear[];
}): ChatContextOption[] {
  const options: ChatContextOption[] = [];

  for (const repo of enabledRepos) {
    const label = `${repo.owner}/${repo.repo}`;
    options.push({
      id: `github-${repo.id}`,
      kind: "github",
      label,
      description: "GitHub repository",
      searchText: `${label} GitHub repository`,
      contextItem: toGithubContextItem(repo),
    });
  }

  for (const integration of enabledLinear) {
    options.push({
      id: `linear-${integration.integrationId}`,
      kind: "linear",
      label: integration.displayName,
      description: "Linear team",
      searchText: `${integration.displayName} ${integration.teamName ?? ""} Linear team`,
      contextItem: {
        type: "linear-team",
        integrationId: integration.integrationId,
        teamName: integration.teamName ?? undefined,
      },
    });
  }

  return options;
}
