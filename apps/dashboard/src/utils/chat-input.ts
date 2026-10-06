import type { ContextItem, TextSelection } from "@notra/ai/types/chat";

import type {
  ChatContextOption,
  EnabledLinear,
  EnabledRepo,
} from "@/types/components/chat-input";
import type {
  ContentChatInputChrome,
  ContentChatInputChromeLabels,
} from "@/types/hooks/content-chat-input";

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
  isUsageBlocked: boolean,
  limitMessage: string
): string | null {
  if (externalError) {
    return externalError;
  }
  if (internalError) {
    return internalError;
  }
  if (isUsageBlocked) {
    return limitMessage;
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
  labels,
  onStop,
  pendingUploadCount,
  queuedCount,
  shouldShowLowCredits,
  skillTagCount,
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
  labels: ContentChatInputChromeLabels;
  onStop?: () => void;
  pendingUploadCount: number;
  queuedCount: number;
  shouldShowLowCredits: boolean;
  skillTagCount: number;
  usageLimitError: string | null;
  value: string;
}): ContentChatInputChrome {
  const isEmpty = value.trim().length === 0 && skillTagCount === 0;
  const hasAttachmentChips = hasReadyAttachments || pendingUploadCount > 0;
  const isInputLocked = disabled || isUsageBlocked;
  // Attachments queue with their message, but only once every upload is done.
  const canQueue =
    isLoading && (!isEmpty || hasReadyAttachments) && pendingUploadCount === 0;
  const showStop = isLoading && !canQueue && Boolean(onStop);
  const hasContextChips =
    contextCount > 0 || hasSelection || queuedCount > 0 || skillTagCount > 0;
  const showComposerNudge =
    hasContextChips ||
    hasAttachmentChips ||
    shouldShowLowCredits ||
    Boolean(usageLimitError);
  const sendChrome = getComposerSendChrome(showStop, canQueue, labels);
  return {
    contextPickerDisabledReason: isInputLocked
      ? labels.contextUnavailable
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

export function getComposerSendChrome(
  showStop: boolean,
  canQueue: boolean,
  labels: ContentChatInputChromeLabels
) {
  if (showStop) {
    return {
      sendLabel: labels.stopGenerating,
      sendTooltip: labels.stopGenerating,
    };
  }
  if (canQueue) {
    return {
      sendLabel: labels.queueMessage,
      sendTooltip: labels.queueHint,
    };
  }
  return {
    sendLabel: labels.sendMessage,
    sendTooltip: labels.sendHint,
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
  labels,
}: {
  enabledRepos: EnabledRepo[];
  enabledLinear: EnabledLinear[];
  labels: { githubRepository: string; linearTeam: string };
}): ChatContextOption[] {
  const options: ChatContextOption[] = [];

  for (const repo of enabledRepos) {
    const label = `${repo.owner}/${repo.repo}`;
    options.push({
      id: `github-${repo.id}`,
      kind: "github",
      label,
      description: labels.githubRepository,
      searchText: `${label} GitHub repository`,
      contextItem: toGithubContextItem(repo),
    });
  }

  for (const integration of enabledLinear) {
    options.push({
      id: `linear-${integration.integrationId}`,
      kind: "linear",
      label: integration.displayName,
      description: labels.linearTeam,
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

/** Short type label for a file tile, e.g. "pdf" from "brief.pdf" or "application/pdf". */
export function getAttachmentExtension(
  filename?: string,
  mediaType?: string
): string | null {
  const fromName = filename?.includes(".")
    ? filename.split(".").pop()
    : undefined;
  if (fromName) {
    return fromName;
  }
  return mediaType?.split("/")[1]?.split(/[+.;]/)[0] ?? null;
}
