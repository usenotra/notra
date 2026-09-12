"use client";

import {
  AiBrain01Icon,
  Alert02Icon,
  ArrowDown01Icon,
  ArrowUp02Icon,
  AtIcon,
  File02Icon,
  PlusSignIcon,
  StopIcon,
  Tick02Icon,
  Upload04Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { FEATURES } from "@notra/ai/billing/features";
import type {
  ChatAttachment,
  ChatInputHandle,
  ContextItem,
} from "@notra/ai/types/chat";
import {
  MAX_CHAT_ATTACHMENTS,
  MAX_CHAT_FILE_SIZE,
  MIME_DISPLAY_LABELS,
  PASTE_TO_ATTACHMENT_THRESHOLD,
} from "@notra/schemas/constants/dashboard/upload";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@notra/ui/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@notra/ui/components/ui/popover";
import { ClaudeAiIcon } from "@notra/ui/components/ui/svgs/claudeAiIcon";
import { Github } from "@notra/ui/components/ui/svgs/github";
import { Linear } from "@notra/ui/components/ui/svgs/linear";
import { Notra } from "@notra/ui/components/ui/svgs/notra";
import { Openai } from "@notra/ui/components/ui/svgs/openai";
import { OpenaiDark } from "@notra/ui/components/ui/svgs/openaiDark";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import { useQuery } from "@tanstack/react-query";
import { Loader2Icon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import {
  type Ref,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";

import { Composer } from "@/components/composer/composer-shell";
import { McpIcon } from "@/components/integrations/mcp-icon";
import { useAutumnRefreshListener } from "@/lib/hooks/use-autumn-refresh-listener";
import { useBillingCustomer } from "@/lib/hooks/use-billing-customer";
import { dashboardOrpc } from "@/lib/orpc/query";
import {
  dragEventHasFiles,
  getUnsupportedAttachmentMessage,
} from "@/lib/upload/chat";
import {
  deleteChatUpload as deleteChatUploadFile,
  uploadFile,
} from "@/lib/upload/client";
import {
  getAllowedChatMimeTypes,
  isAllowedChatMimeType,
  isImageMimeType,
} from "@/lib/upload/mime";
import type { ChatContextOption } from "@/types/components/chat-input";
import type { GitHubRepository } from "@/types/integrations";
import { hasIncludedChatPlan } from "@/utils/chat-billing";
import {
  CHAT_INPUT_LIMIT_MESSAGE,
  contextItemKey,
  contextItemsEqual,
} from "@/utils/chat-input";
import {
  extractIntegrationReferences,
  getIntegrationReferenceValue,
  getReferenceDisplay,
} from "@/utils/integration-reference";

import { AttachmentPreviewDialog } from "./attachment-preview";
import { ChatContextConnectSuggestions } from "./chat-context-connect-suggestions";
import { ChatContextOptionContent } from "./chat-context-option-content";
import type { QueuedMessage } from "./chat-queue";
import {
  serializeEditorWithReferences,
  serializeFragmentWithReferences,
} from "./integration-reference";

const GENERIC_PASTED_IMAGE_NAME_RE = /^image\.(jpe?g|png|gif|webp)$/i;

export const AVAILABLE_MODELS = [
  {
    id: "auto",
    label: "Auto",
    description: "Picks the best model for your message",
    pricing: "Varies by selected model",
    provider: "auto",
  },
  {
    id: "anthropic/claude-opus-5",
    label: "Claude Opus 5",
    description: "Most advanced reasoning",
    pricing: "$5 input / $25 output per 1M",
    provider: "anthropic",
  },
  {
    id: "anthropic/claude-opus-4.8",
    label: "Claude Opus 4.8",
    description: "Deepest reasoning",
    pricing: "$5 input / $25 output per 1M",
    provider: "anthropic",
  },
  {
    id: "anthropic/claude-sonnet-5",
    label: "Sonnet 5",
    description: "Near-Opus quality at Sonnet speed",
    pricing: "$2 input / $10 output per 1M",
    provider: "anthropic",
  },
  {
    id: "anthropic/claude-sonnet-4.6",
    label: "Sonnet 4.6",
    description: "Best everyday default",
    pricing: "$3 input / $15 output per 1M",
    provider: "anthropic",
  },
  {
    id: "anthropic/claude-haiku-4.5",
    label: "Haiku 4.5",
    description: "Fastest responses",
    pricing: "$1 input / $5 output per 1M",
    provider: "anthropic",
  },
  {
    id: "openai/gpt-5.4",
    label: "GPT-5.4",
    description: "Best for creative writing",
    pricing: "$2.50 input / $15 output per 1M",
    provider: "openai",
  },
  {
    id: "openai/gpt-5.5",
    label: "GPT-5.5",
    description: "Latest OpenAI flagship",
    pricing: "$5 input / $30 output per 1M",
    provider: "openai",
  },
] as const;

type ModelProvider = (typeof AVAILABLE_MODELS)[number]["provider"];

export function ModelIcon({
  provider,
  className,
}: {
  provider: ModelProvider;
  className?: string;
}) {
  if (provider === "openai") {
    return (
      <>
        <Openai className={`${className ?? ""} block dark:hidden`} />
        <OpenaiDark className={`${className ?? ""} hidden dark:block`} />
      </>
    );
  }
  if (provider === "auto") {
    return <Notra className={className} />;
  }
  return <ClaudeAiIcon className={className} />;
}

const THINKING_LEVELS = ["off", "low", "medium", "high"] as const;
export type ThinkingLevel = (typeof THINKING_LEVELS)[number];

function getSubmitTooltipText({
  canQueue,
  isEmpty,
  isLoading,
  isQueued,
  isStopping,
  isUsageBlocked,
}: {
  canQueue: boolean;
  isEmpty: boolean;
  isLoading: boolean;
  isQueued: boolean;
  isStopping: boolean;
  isUsageBlocked: boolean;
}): string {
  if (isLoading && isStopping) {
    return "Stopping...";
  }
  if (isQueued) {
    return "Will send once uploads finish. Click to cancel.";
  }
  if (isLoading && isEmpty) {
    return "Stop generating";
  }
  if (isUsageBlocked) {
    return CHAT_INPUT_LIMIT_MESSAGE;
  }
  if (canQueue) {
    return "Enter to queue this message. It will send once the AI finishes.";
  }
  return "Enter to send. Shift+Enter for a new line.";
}

function getContextPickerDisabledReason(
  isLoading: boolean,
  isQueued: boolean
): string | null {
  if (isQueued) {
    return "Cancel the pending message before changing tools or context.";
  }
  if (isLoading) {
    return "Wait for the current response before changing tools or context.";
  }
  return null;
}

function ContextChipIcon({ item }: { item: ContextItem }) {
  if (item.type === "github-repo") {
    return <Github className="size-3.5 shrink-0" />;
  }
  if (item.type === "linear-team") {
    return <Linear className="size-3.5 shrink-0" />;
  }
  return <McpIcon className="size-3.5" />;
}

interface ChatInputAdvancedProps {
  onSend?: (value: string, attachments: ChatAttachment[]) => void;
  onStop?: () => void;
  initialValue?: string;
  isLoading?: boolean;
  isStopping?: boolean;
  organizationSlug?: string;
  organizationId?: string;
  context?: ContextItem[];
  onAddContext?: (item: ContextItem) => void;
  onRemoveContext?: (item: ContextItem) => void;
  error?: string | null;
  onClearError?: () => void;
  model?: string;
  onModelChange?: (model: string) => void;
  thinkingLevel?: ThinkingLevel;
  onThinkingLevelChange?: (level: ThinkingLevel) => void;
  connectedTop?: boolean;
  queuedMessages?: QueuedMessage[];
  onUpdateQueued?: (id: string, text: string) => void;
  onEmptyChange?: (isEmpty: boolean) => void;
  draftStorageKey?: string;
  ref?: Ref<ChatInputHandle>;
}

const THINKING_LABELS: Record<ThinkingLevel, string> = {
  off: "None",
  low: "Low",
  medium: "Medium",
  high: "High",
};

interface PendingUploadItem {
  id: string;
  filename: string;
}

interface QueuedSendSnapshot {
  value: string;
  attachments: ChatAttachment[];
  pendingUploadIds: string[];
}

export function ChatInputAdvanced({
  onSend,
  onStop,
  initialValue,
  isLoading = false,
  isStopping = false,
  organizationSlug,
  organizationId,
  context = [],
  onAddContext,
  onRemoveContext,
  error: externalError,
  onClearError,
  model = "auto",
  onModelChange,
  thinkingLevel = "medium",
  onThinkingLevelChange,
  connectedTop = false,
  onEmptyChange,
  draftStorageKey,
  ref,
}: ChatInputAdvancedProps) {
  const contextPickerId = useId();
  const currentModel =
    AVAILABLE_MODELS.find((availableModel) => availableModel.id === model) ??
    AVAILABLE_MODELS[0];
  const [isModelPickerOpen, setIsModelPickerOpen] = useState(false);
  const [isContextPickerOpen, setIsContextPickerOpen] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const [internalError, setInternalError] = useState<string | null>(null);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const mentionAnchorRef = useRef<{ node: Node; offset: number } | null>(null);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const mentionListRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const lastInitialValueRef = useRef<string | undefined>(undefined);
  const contextRef = useRef(context);

  useEffect(() => {
    contextRef.current = context;
  }, [context]);

  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [pendingUploads, setPendingUploads] = useState<PendingUploadItem[]>([]);
  const [pendingSend, setPendingSend] = useState<QueuedSendSnapshot | null>(
    null
  );
  const [previewAttachment, setPreviewAttachment] =
    useState<ChatAttachment | null>(null);
  const isUploading = pendingUploads.length > 0;
  const isQueued = pendingSend !== null;
  const contextPickerDisabledReason = getContextPickerDisabledReason(
    isLoading,
    isQueued
  );
  const attachmentsRef = useRef(attachments);
  const pendingUploadsRef = useRef(pendingUploads);

  useEffect(() => {
    attachmentsRef.current = attachments;
    pendingUploadsRef.current = pendingUploads;
  }, [attachments, pendingUploads]);
  const completedUploadsRef = useRef(new Map<string, ChatAttachment>());
  const isMountedRef = useRef(true);
  const submittedKeysRef = useRef<Set<string>>(new Set());

  const allowedChatMimeTypes = useMemo(
    () => getAllowedChatMimeTypes(model),
    [model]
  );
  const acceptedFileTypesLabel = useMemo(() => {
    const seen = new Set<string>();
    const labels: string[] = [];
    for (const mime of allowedChatMimeTypes) {
      const label = MIME_DISPLAY_LABELS[mime];
      if (label && !seen.has(label)) {
        seen.add(label);
        labels.push(label);
      }
    }
    return labels.join(", ");
  }, [allowedChatMimeTypes]);

  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const dragCounterRef = useRef(0);
  const hasUnsupportedAttachmentsForModel = attachments.some(
    (attachment) => !isAllowedChatMimeType(attachment.mediaType, model)
  );
  const attachmentTooltipText =
    model === "openai/gpt-5.4"
      ? "Attach images or PDFs"
      : "Attach images, PDFs, or text";

  const cleanupChatUpload = useCallback(async (key: string) => {
    try {
      await deleteChatUploadFile({ key });
    } catch {
      // noop
    }
  }, []);

  const removeAttachment = useCallback(
    (key: string) => {
      const attachmentToRemove = attachmentsRef.current.find(
        (attachment) => attachment.key === key
      );
      if (!attachmentToRemove) {
        return;
      }
      const nextAttachments = attachmentsRef.current.filter(
        (attachment) => attachment.key !== key
      );
      attachmentsRef.current = nextAttachments;
      setAttachments(nextAttachments);
      cleanupChatUpload(attachmentToRemove.key).catch(() => undefined);
    },
    [cleanupChatUpload]
  );

  const updatePendingUploads = useCallback((next: PendingUploadItem[]) => {
    pendingUploadsRef.current = next;
    if (isMountedRef.current) {
      setPendingUploads(next);
    }
  }, []);

  const handleFilesSelected = useCallback(
    async (selected: FileList | File[]) => {
      const files = Array.from(selected);
      if (files.length === 0) {
        return false;
      }

      const remainingSlots =
        MAX_CHAT_ATTACHMENTS -
        attachmentsRef.current.length -
        pendingUploadsRef.current.length;
      if (remainingSlots <= 0) {
        toast.error(
          `You can attach at most ${MAX_CHAT_ATTACHMENTS} files per message.`
        );
        return false;
      }

      const accepted: File[] = [];
      for (const file of files.slice(0, remainingSlots)) {
        if (!isAllowedChatMimeType(file.type, model)) {
          toast.error(
            file.type === "text/plain" || file.type === "text/markdown"
              ? getUnsupportedAttachmentMessage(currentModel.label)
              : `Unsupported file type: ${file.name}`
          );
          continue;
        }
        if (file.size > MAX_CHAT_FILE_SIZE) {
          toast.error(
            `${file.name} exceeds the ${MAX_CHAT_FILE_SIZE / 1024 / 1024}MB limit.`
          );
          continue;
        }
        accepted.push(file);
      }

      if (accepted.length === 0) {
        return false;
      }

      const placeholders = accepted.map((file) => ({
        id: crypto.randomUUID(),
        filename: file.name,
      }));
      updatePendingUploads([...pendingUploadsRef.current, ...placeholders]);

      const results = await Promise.all(
        accepted.map(async (file, index) => {
          const placeholder = placeholders[index];
          if (!placeholder) {
            return false;
          }
          try {
            const result = await uploadFile({ file, type: "chat" });
            const uploadedAttachment = {
              url: result.url,
              key: result.key,
              filename: file.name,
              mediaType: file.type,
              size: file.size,
            };
            completedUploadsRef.current.set(placeholder.id, uploadedAttachment);

            if (!isMountedRef.current) {
              await cleanupChatUpload(result.key);
              updatePendingUploads(
                pendingUploadsRef.current.filter(
                  (pending) => pending.id !== placeholder.id
                )
              );
              return false;
            }

            const nextAttachments = [
              ...attachmentsRef.current,
              uploadedAttachment,
            ];
            attachmentsRef.current = nextAttachments;
            setAttachments(nextAttachments);
            updatePendingUploads(
              pendingUploadsRef.current.filter(
                (pending) => pending.id !== placeholder.id
              )
            );
            return true;
          } catch (err) {
            const message =
              err instanceof Error ? err.message : "Upload failed";
            toast.error(`Failed to upload ${file.name}: ${message}`);
            updatePendingUploads(
              pendingUploadsRef.current.filter(
                (pending) => pending.id !== placeholder.id
              )
            );
            return false;
          }
        })
      );
      return results.every(Boolean);
    },
    [cleanupChatUpload, currentModel.label, model, updatePendingUploads]
  );

  const onFileInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (files && files.length > 0) {
        handleFilesSelected(files).catch(() => undefined);
      }
      event.target.value = "";
    },
    [handleFilesSelected]
  );

  const cleanupUnsubmittedAttachments = useCallback(() => {
    for (const attachment of attachmentsRef.current) {
      if (submittedKeysRef.current.has(attachment.key)) {
        continue;
      }
      cleanupChatUpload(attachment.key).catch(() => undefined);
    }
  }, [cleanupChatUpload]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      cleanupUnsubmittedAttachments();
    };
  }, [cleanupUnsubmittedAttachments]);

  const onEmptyChangeRef = useRef(onEmptyChange);

  useEffect(() => {
    onEmptyChangeRef.current = onEmptyChange;
  }, [onEmptyChange]);

  useEffect(() => {
    onEmptyChangeRef.current?.(isEmpty);
  }, [isEmpty]);

  useEffect(() => {
    function onDragEnter(event: DragEvent) {
      if (!dragEventHasFiles(event)) {
        return;
      }
      dragCounterRef.current += 1;
      setIsDraggingFile(true);
    }
    function onDragLeave(event: DragEvent) {
      if (!dragEventHasFiles(event)) {
        return;
      }
      dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
      if (dragCounterRef.current === 0) {
        setIsDraggingFile(false);
      }
    }
    function onDragOver(event: DragEvent) {
      if (!dragEventHasFiles(event)) {
        return;
      }
      event.preventDefault();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = "copy";
      }
    }
    function onDrop(event: DragEvent) {
      const files = event.dataTransfer?.files;
      const hasFiles = (files && files.length > 0) || dragEventHasFiles(event);
      if (!hasFiles) {
        return;
      }
      event.preventDefault();
      dragCounterRef.current = 0;
      setIsDraggingFile(false);
      if (files && files.length > 0) {
        handleFilesSelected(files).catch(() => undefined);
      }
    }

    document.addEventListener("dragenter", onDragEnter);
    document.addEventListener("dragleave", onDragLeave);
    document.addEventListener("dragover", onDragOver);
    document.addEventListener("drop", onDrop);
    return () => {
      document.removeEventListener("dragenter", onDragEnter);
      document.removeEventListener("dragleave", onDragLeave);
      document.removeEventListener("dragover", onDragOver);
      document.removeEventListener("drop", onDrop);
    };
  }, [handleFilesSelected]);
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

  const { data: integrationsData } = useQuery(
    dashboardOrpc.integrations.list.queryOptions({
      input: { organizationId: organizationId ?? "" },
      enabled: !!organizationId,
    })
  );
  const { data: customMcpData } = useQuery(
    dashboardOrpc.integrations.mcp.list.queryOptions({
      input: { organizationId: organizationId ?? "" },
      enabled: !!organizationId,
    })
  );
  const { data: mcpStoreData } = useQuery(
    dashboardOrpc.integrations.mcp.storeList.queryOptions({
      input: { organizationId: organizationId ?? "" },
      enabled: !!organizationId,
    })
  );

  const enabledRepos = useMemo(() => {
    const result: Array<GitHubRepository & { integrationId: string }> = [];
    for (const integration of integrationsData?.integrations ?? []) {
      for (const repo of integration.repositories) {
        if (repo.enabled) {
          result.push({ ...repo, integrationId: integration.id });
        }
      }
    }
    return result;
  }, [integrationsData?.integrations]);

  const enabledLinearIntegrations = useMemo(() => {
    const result: Array<{
      id: string;
      displayName: string;
      integrationId: string;
      teamName?: string | null;
    }> = [];
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

  const contextOptions = useMemo(() => {
    const options: ChatContextOption[] = [];

    for (const repo of enabledRepos) {
      const label = `${repo.owner}/${repo.repo}`;
      options.push({
        id: `github-${repo.id}`,
        kind: "github",
        label,
        description: "GitHub repository",
        searchText: `${label} GitHub repository`,
        contextItem: {
          type: "github-repo",
          owner: repo.owner,
          repo: repo.repo,
          integrationId: repo.integrationId,
        },
      });
    }

    for (const integration of enabledLinearIntegrations) {
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

    for (const server of customMcpData?.servers ?? []) {
      if (!server.enabled) {
        continue;
      }
      const toolLabel = `${server.indexedToolCount} ${server.indexedToolCount === 1 ? "tool" : "tools"}`;
      options.push({
        id: `mcp-${server.id}`,
        kind: "mcp",
        label: server.name,
        description: `Custom MCP server · ${toolLabel}`,
        searchText: `${server.name} ${server.description ?? ""} custom MCP ${toolLabel}`,
        contextItem: {
          type: "mcp-server",
          integrationId: server.id,
          name: server.name,
        },
        logoLightUrl: server.logoLightUrl,
        logoDarkUrl: server.logoDarkUrl,
      });
    }

    for (const integration of mcpStoreData?.integrations ?? []) {
      const connection = integration.connection;
      if (!(integration.connected && connection?.enabled)) {
        continue;
      }
      const toolLabel = `${connection.indexedToolCount} ${connection.indexedToolCount === 1 ? "tool" : "tools"}`;
      options.push({
        id: `mcp-${connection.id}`,
        kind: "mcp",
        label: integration.name,
        description: `Marketplace MCP server · ${toolLabel}`,
        searchText: `${integration.name} ${integration.description ?? ""} ${integration.author ?? ""} marketplace MCP ${toolLabel}`,
        contextItem: {
          type: "mcp-server",
          integrationId: connection.id,
          name: integration.name,
        },
        logoLightUrl: integration.logoLightUrl,
        logoDarkUrl: integration.logoDarkUrl,
      });
    }

    return options;
  }, [
    customMcpData?.servers,
    enabledLinearIntegrations,
    enabledRepos,
    mcpStoreData?.integrations,
  ]);

  const integrationContextOptions = useMemo(
    () => contextOptions.filter((option) => option.kind !== "mcp"),
    [contextOptions]
  );
  const mcpToolOptions = useMemo(
    () => contextOptions.filter((option) => option.kind === "mcp"),
    [contextOptions]
  );

  const isInContext = useCallback(
    (item: ContextItem) =>
      context.some((contextItem) => contextItemsEqual(contextItem, item)),
    [context]
  );

  const filteredMentionItems = useMemo(() => {
    if (mentionQuery === null) {
      return [];
    }
    const q = mentionQuery.trim().toLowerCase();
    return contextOptions.filter((option) =>
      option.searchText.toLowerCase().includes(q)
    );
  }, [contextOptions, mentionQuery]);

  const readEditorText = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) {
      return "";
    }
    return (editor.innerText ?? "").replace(/\u00A0/g, " ");
  }, []);
  const submitRef = useRef<() => void>(() => {
    // noop
  });

  useImperativeHandle(
    ref,
    () => ({
      setText: (text: string) => {
        const editor = editorRef.current;
        if (!editor) {
          return;
        }
        editor.textContent = text;
        setIsEmpty(text.trim().length === 0);
        editor.focus();
        const range = document.createRange();
        range.selectNodeContents(editor);
        range.collapse(false);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      },
      focus: () => {
        editorRef.current?.focus();
      },
      submit: () => {
        submitRef.current();
      },
    }),
    []
  );

  const persistDraft = useCallback(
    (draftContext: readonly ContextItem[]) => {
      const editor = editorRef.current;
      if (!(editor && draftStorageKey)) {
        return;
      }

      try {
        const text = serializeEditorWithReferences(editor).trim();
        const references = draftContext
          .map(getIntegrationReferenceValue)
          .join("\n");
        const draft = [text, references].filter(Boolean).join("\n");
        if (draft) {
          window.localStorage.setItem(draftStorageKey, draft);
        } else {
          window.localStorage.removeItem(draftStorageKey);
        }
      } catch {
        // noop
      }
    },
    [draftStorageKey]
  );

  const handleInput = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }
    setIsEmpty(readEditorText().trim().length === 0);
    persistDraft(contextRef.current);

    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) {
      setMentionQuery(null);
      mentionAnchorRef.current = null;
      return;
    }
    const range = sel.getRangeAt(0);
    if (!editor.contains(range.startContainer)) {
      setMentionQuery(null);
      mentionAnchorRef.current = null;
      return;
    }

    if (range.startContainer.nodeType === Node.TEXT_NODE) {
      const nodeText = range.startContainer.textContent ?? "";
      const textBefore = nodeText.slice(0, range.startOffset);

      const atIndex = textBefore.lastIndexOf("@");
      if (atIndex !== -1) {
        const charBefore = atIndex > 0 ? textBefore[atIndex - 1] : " ";
        const isBoundary =
          atIndex === 0 ||
          charBefore === " " ||
          charBefore === "\n" ||
          charBefore === "\u00A0";
        if (isBoundary) {
          const query = textBefore.slice(atIndex + 1);
          if (
            !(
              query.includes(" ") ||
              query.includes("\n") ||
              query.includes("\u00A0")
            )
          ) {
            mentionAnchorRef.current = {
              node: range.startContainer,
              offset: atIndex,
            };
            setMentionQuery(query);
            setMentionIndex(0);
            return;
          }
        }
      }
    }

    mentionAnchorRef.current = null;
    setMentionQuery(null);
  }, [persistDraft, readEditorText]);

  const restoredDraftKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!draftStorageKey || restoredDraftKeyRef.current === draftStorageKey) {
      return;
    }
    restoredDraftKeyRef.current = draftStorageKey;
    const editor = editorRef.current;
    if (!editor || initialValue || readEditorText().trim().length > 0) {
      return;
    }
    try {
      const draft = window.localStorage.getItem(draftStorageKey);
      if (!draft) {
        return;
      }
      const restoredDraft = extractIntegrationReferences(draft);
      for (const referencedItem of restoredDraft.items) {
        onAddContext?.(referencedItem);
      }
      const restoredText = restoredDraft.text.trim();
      editor.textContent = restoredText;
      setIsEmpty(restoredText.length === 0);
    } catch {
      // noop
    }
  }, [draftStorageKey, initialValue, onAddContext, readEditorText]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || initialValue === lastInitialValueRef.current) {
      return;
    }

    lastInitialValueRef.current = initialValue;
    editor.replaceChildren();

    if (initialValue) {
      editor.append(document.createTextNode(initialValue));
    }

    setIsEmpty(!(initialValue?.trim().length ?? 0));
    setMentionQuery(null);
    mentionAnchorRef.current = null;

    if (!initialValue) {
      return;
    }

    editor.focus();
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    selection?.removeAllRanges();
    selection?.addRange(range);
  }, [initialValue]);

  const insertMention = useCallback(
    (option: ChatContextOption) => {
      const editor = editorRef.current;
      const anchor = mentionAnchorRef.current;
      if (!editor || !anchor) {
        return;
      }
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) {
        return;
      }
      const cursor = sel.getRangeAt(0);
      if (!editor.contains(cursor.startContainer)) {
        return;
      }

      const replaceRange = document.createRange();
      replaceRange.setStart(anchor.node, anchor.offset);
      replaceRange.setEnd(cursor.startContainer, cursor.startOffset);

      replaceRange.deleteContents();
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(replaceRange);
      let nextContext = contextRef.current;
      if (
        !contextRef.current.some((item) =>
          contextItemsEqual(item, option.contextItem)
        )
      ) {
        nextContext = [...contextRef.current, option.contextItem];
        onAddContext?.(option.contextItem);
      }
      editor.dispatchEvent(new Event("input", { bubbles: true }));
      persistDraft(nextContext);

      mentionAnchorRef.current = null;
      setMentionQuery(null);
      editor.focus();
    },
    [onAddContext, persistDraft]
  );

  const addContext = useCallback(
    (option: ChatContextOption) => {
      const item = option.contextItem;
      if (contextRef.current.some((c) => contextItemsEqual(c, item))) {
        return;
      }
      onAddContext?.(item);
      persistDraft([...contextRef.current, item]);
      editorRef.current?.focus();
    },
    [onAddContext, persistDraft]
  );

  const removeContext = useCallback(
    (item: ContextItem) => {
      onRemoveContext?.(item);
      persistDraft(
        contextRef.current.filter(
          (contextItem) => !contextItemsEqual(contextItem, item)
        )
      );
    },
    [onRemoveContext, persistDraft]
  );

  const insertTextAtRange = useCallback(
    (text: string, targetRange?: Range) => {
      const editor = editorRef.current;
      if (!editor) {
        return;
      }

      const selection = window.getSelection();
      let range: Range | null = null;

      if (
        targetRange?.startContainer.isConnected &&
        editor.contains(targetRange.startContainer)
      ) {
        range = targetRange;
      } else if (selection && selection.rangeCount > 0) {
        range = selection.getRangeAt(0);
      }

      if (!range) {
        return;
      }

      range.deleteContents();

      const pastedContent = extractIntegrationReferences(text);
      let nextContext = contextRef.current;
      for (const referencedItem of pastedContent.items) {
        if (
          !nextContext.some((item) => contextItemsEqual(item, referencedItem))
        ) {
          nextContext = [...nextContext, referencedItem];
          onAddContext?.(referencedItem);
        }
      }
      const textNode = document.createTextNode(pastedContent.text);
      range.insertNode(textNode);

      const after = document.createRange();
      after.setStartAfter(textNode);
      after.collapse(true);
      selection?.removeAllRanges();
      selection?.addRange(after);
      editor.dispatchEvent(new Event("input", { bubbles: true }));
      persistDraft(nextContext);
    },
    [onAddContext, persistDraft]
  );

  const clearComposer = useCallback(() => {
    const editor = editorRef.current;
    if (editor) {
      editor.innerHTML = "";
    }
    if (draftStorageKey) {
      try {
        window.localStorage.removeItem(draftStorageKey);
      } catch {
        // noop
      }
    }
    setIsEmpty(true);
    setAttachments([]);
    attachmentsRef.current = [];
    setPendingSend(null);
    completedUploadsRef.current.clear();
    for (const item of contextRef.current) {
      onRemoveContext?.(item);
    }
  }, [draftStorageKey, onRemoveContext]);

  const sendSnapshot = useCallback(
    (value: string, snapshotAttachments: ChatAttachment[]) => {
      if (isLoading) {
        return false;
      }
      if (!(value || snapshotAttachments.length > 0)) {
        return false;
      }
      clearError();
      if (
        snapshotAttachments.some(
          (attachment) => !isAllowedChatMimeType(attachment.mediaType, model)
        )
      ) {
        return false;
      }
      if (isUsageBlocked) {
        setInternalError(CHAT_INPUT_LIMIT_MESSAGE);
        return false;
      }
      if (customer && !chatIncludedInPlan) {
        const result = check({
          featureId: FEATURES.AI_CREDITS,
          requiredBalance: 1,
        });
        if (result?.allowed === false) {
          setInternalError(CHAT_INPUT_LIMIT_MESSAGE);
          return false;
        }
      }

      for (const attachment of snapshotAttachments) {
        submittedKeysRef.current.add(attachment.key);
      }
      onSend?.(value, snapshotAttachments);
      clearComposer();
      return true;
    },
    [
      check,
      clearComposer,
      clearError,
      customer,
      chatIncludedInPlan,
      isLoading,
      isUsageBlocked,
      model,
      onSend,
    ]
  );

  const performSend = useCallback(() => {
    const editor = editorRef.current;
    if (!editor || isLoading) {
      return false;
    }
    const hasText = readEditorText().trim().length > 0;
    const currentAttachments = attachmentsRef.current;
    if (!hasText && currentAttachments.length === 0) {
      return false;
    }
    const outbound = serializeEditorWithReferences(editor).trim();
    return sendSnapshot(outbound, currentAttachments);
  }, [isLoading, readEditorText, sendSnapshot]);

  const handleSend = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }
    if (isLoading) {
      const hasText = readEditorText().trim().length > 0;
      const hasAttachments =
        attachmentsRef.current.length > 0 ||
        pendingUploadsRef.current.length > 0;
      if (!hasText || hasAttachments) {
        return;
      }
      clearError();
      if (isUsageBlocked) {
        setInternalError(CHAT_INPUT_LIMIT_MESSAGE);
        return;
      }
      if (customer && !chatIncludedInPlan) {
        const result = check({
          featureId: FEATURES.AI_CREDITS,
          requiredBalance: 1,
        });
        if (result?.allowed === false) {
          setInternalError(CHAT_INPUT_LIMIT_MESSAGE);
          return;
        }
      }
      onSend?.(serializeEditorWithReferences(editor).trim(), []);
      clearComposer();
      return;
    }
    if (isUploading) {
      const hasText = readEditorText().trim().length > 0;
      const hasContent =
        hasText ||
        attachmentsRef.current.length > 0 ||
        pendingUploadsRef.current.length > 0;
      if (!hasContent) {
        return;
      }
      if (hasUnsupportedAttachmentsForModel) {
        return;
      }
      if (isUsageBlocked) {
        setInternalError(CHAT_INPUT_LIMIT_MESSAGE);
        return;
      }
      clearError();
      setPendingSend({
        value: serializeEditorWithReferences(editor).trim(),
        attachments: [...attachmentsRef.current],
        pendingUploadIds: pendingUploadsRef.current.map(
          (pending) => pending.id
        ),
      });
      return;
    }
    performSend();
  }, [
    check,
    clearComposer,
    clearError,
    customer,
    chatIncludedInPlan,
    isLoading,
    isUploading,
    readEditorText,
    hasUnsupportedAttachmentsForModel,
    isUsageBlocked,
    onSend,
    performSend,
  ]);

  useEffect(() => {
    submitRef.current = handleSend;
  }, [handleSend]);

  useEffect(() => {
    if (!(pendingSend && !isUploading)) {
      return;
    }
    const resolvedAttachments = pendingSend.pendingUploadIds
      .map((pendingUploadId) =>
        completedUploadsRef.current.get(pendingUploadId)
      )
      .filter((attachment): attachment is ChatAttachment => attachment != null);

    if (resolvedAttachments.length !== pendingSend.pendingUploadIds.length) {
      setPendingSend(null);
      setInternalError(
        "Some attachments failed to upload. Please remove or retry them before sending."
      );
      return;
    }

    sendSnapshot(pendingSend.value, [
      ...pendingSend.attachments,
      ...resolvedAttachments,
    ]);
  }, [isUploading, pendingSend, sendSnapshot]);

  const handlePaste = useCallback(
    (event: React.ClipboardEvent<HTMLDivElement>) => {
      const pasteTimestamp = Date.now();
      const pastedFiles = Array.from(event.clipboardData.files).map(
        (file, index) => {
          const hasMeaningfulName =
            file.name && !GENERIC_PASTED_IMAGE_NAME_RE.test(file.name);
          if (hasMeaningfulName) {
            return file;
          }
          const extFromType = file.type.split("/")[1]?.split("+")[0];
          const extFromName = file.name?.includes(".")
            ? file.name.split(".").pop()
            : undefined;
          const ext = extFromName ?? extFromType ?? "png";
          const suffix = index === 0 ? "" : `-${index}`;
          return new File([file], `pasted-${pasteTimestamp}${suffix}.${ext}`, {
            type: file.type,
            lastModified: file.lastModified,
          });
        }
      );
      if (pastedFiles.length > 0) {
        event.preventDefault();
        handleFilesSelected(pastedFiles).catch(() => undefined);
        return;
      }

      event.preventDefault();
      const text = event.clipboardData.getData("text/plain");

      if (
        text.length >= PASTE_TO_ATTACHMENT_THRESHOLD &&
        isAllowedChatMimeType("text/plain", model)
      ) {
        const selection = window.getSelection();
        const fallbackRange =
          selection && selection.rangeCount > 0
            ? selection.getRangeAt(0).cloneRange()
            : undefined;
        const file = new File([text], `pasted-${Date.now()}.txt`, {
          type: "text/plain",
        });
        handleFilesSelected([file])
          .then((uploaded) => {
            if (!uploaded) {
              insertTextAtRange(text, fallbackRange);
            }
          })
          .catch(() => {
            insertTextAtRange(text, fallbackRange);
          });
        return;
      }

      insertTextAtRange(text);
    },
    [handleFilesSelected, insertTextAtRange, model]
  );

  const handleCopy = useCallback(
    (event: React.ClipboardEvent<HTMLDivElement>) => {
      const editor = editorRef.current;
      const selection = window.getSelection();
      if (!editor || !selection || selection.rangeCount === 0) {
        return;
      }

      const range = selection.getRangeAt(0);
      if (!editor.contains(range.commonAncestorContainer) || range.collapsed) {
        return;
      }

      event.preventDefault();
      const fragment = range.cloneContents();
      const serialized = serializeFragmentWithReferences(fragment);
      event.clipboardData.setData("text/plain", serialized);
    },
    []
  );

  const handleCut = useCallback(
    (event: React.ClipboardEvent<HTMLDivElement>) => {
      const editor = editorRef.current;
      const selection = window.getSelection();
      if (!editor || !selection || selection.rangeCount === 0) {
        return;
      }

      const range = selection.getRangeAt(0);
      if (!editor.contains(range.commonAncestorContainer) || range.collapsed) {
        return;
      }

      event.preventDefault();
      const fragment = range.cloneContents();
      const serialized = serializeFragmentWithReferences(fragment);
      event.clipboardData.setData("text/plain", serialized);

      range.deleteContents();
      selection.removeAllRanges();
      selection.addRange(range);
      editor.dispatchEvent(new Event("input", { bubbles: true }));
    },
    []
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (mentionQuery !== null && filteredMentionItems.length > 0) {
        if (event.key === "ArrowDown") {
          event.preventDefault();
          setMentionIndex((prev) =>
            prev < filteredMentionItems.length - 1 ? prev + 1 : 0
          );
          return;
        }
        if (event.key === "ArrowUp") {
          event.preventDefault();
          setMentionIndex((prev) =>
            prev > 0 ? prev - 1 : filteredMentionItems.length - 1
          );
          return;
        }
        if (event.key === "Enter") {
          event.preventDefault();
          const selected = filteredMentionItems[mentionIndex];
          if (selected) {
            insertMention(selected);
          }
          return;
        }
        if (event.key === "Escape") {
          event.preventDefault();
          setMentionQuery(null);
          mentionAnchorRef.current = null;
          return;
        }
      }

      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        handleSend();
        return;
      }

      if (event.key === "Enter" && event.shiftKey) {
        event.preventDefault();
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) {
          return;
        }
        const range = sel.getRangeAt(0);
        range.deleteContents();
        const br = document.createElement("br");
        range.insertNode(br);
        const after = document.createRange();
        after.setStartAfter(br);
        after.collapse(true);
        sel.removeAllRanges();
        sel.addRange(after);
        editorRef.current?.dispatchEvent(new Event("input", { bubbles: true }));
        return;
      }
    },
    [
      mentionQuery,
      filteredMentionItems,
      mentionIndex,
      insertMention,
      handleSend,
    ]
  );

  const hasContextChips = context.length > 0;
  const hasAttachmentChips =
    attachments.length > 0 || pendingUploads.length > 0;
  const showComposerNudge =
    hasContextChips ||
    hasAttachmentChips ||
    shouldShowLowCredits ||
    Boolean(usageLimitError);

  return (
    <>
      {isDraggingFile &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            aria-hidden="true"
            className="fade-in-0 animate-in bg-background/75 duration-fast pointer-events-none fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-sm"
          >
            <div className="flex flex-col items-center gap-5">
              <HugeiconsIcon
                className="text-foreground size-14"
                icon={Upload04Icon}
                strokeWidth={1.5}
              />
              <div className="flex flex-col items-center gap-2 text-center">
                <p className="text-foreground text-2xl font-semibold tracking-tight">
                  Add Attachment
                </p>
                <p className="text-muted-foreground text-sm">
                  Drop a file here to attach it to your message
                </p>
                {acceptedFileTypesLabel && (
                  <p className="text-muted-foreground/70 text-xs">
                    Accepted file types: {acceptedFileTypesLabel}
                  </p>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
      <div className="relative w-full min-w-0">
        {mentionQuery !== null && (
          <div
            className="absolute bottom-full left-1 z-50 mb-1 w-72"
            ref={mentionListRef}
          >
            <div className="border-border bg-popover text-popover-foreground max-h-64 overflow-y-auto rounded-md border p-1 shadow-md">
              {filteredMentionItems.length > 0 ? (
                <>
                  {filteredMentionItems.map((option, idx) => {
                    const inContext = isInContext(option.contextItem);
                    const previousOption = filteredMentionItems[idx - 1];
                    const startsGroup =
                      idx === 0 ||
                      (previousOption?.kind === "mcp") !==
                        (option.kind === "mcp");
                    return (
                      <div key={option.id}>
                        {startsGroup && (
                          <div className="px-2 py-1.5 text-xs font-semibold">
                            {option.kind === "mcp" ? "MCP tools" : "Context"}
                          </div>
                        )}
                        <button
                          className={`flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm transition-colors outline-none ${
                            idx === mentionIndex
                              ? "bg-accent text-accent-foreground"
                              : "text-popover-foreground hover:bg-accent hover:text-accent-foreground"
                          }`}
                          onMouseDown={(event) => {
                            event.preventDefault();
                            insertMention(option);
                          }}
                          type="button"
                        >
                          <ChatContextOptionContent option={option} />
                          {inContext && (
                            <span className="text-success shrink-0 text-xs">
                              Added
                            </span>
                          )}
                        </button>
                      </div>
                    );
                  })}
                  {organizationSlug && (
                    <>
                      <div className="bg-border -mx-1 my-1 h-px" />
                      <Link
                        className="hover:bg-accent hover:text-accent-foreground flex w-full items-center rounded-sm px-2 py-1.5 text-sm transition-colors outline-none"
                        href={`/${organizationSlug}/integrations`}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                        }}
                      >
                        Manage integrations
                      </Link>
                    </>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center gap-1 px-3 py-4 text-center">
                  <span className="text-muted-foreground text-xs">
                    {contextOptions.length === 0
                      ? "No context or MCP tools connected"
                      : "No matches found"}
                  </span>
                  {contextOptions.length === 0 && organizationSlug && (
                    <Link
                      className="text-primary text-xs hover:underline"
                      href={`/${organizationSlug}/integrations`}
                    >
                      Connect integrations
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
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
                    {context.map((item) => {
                      const label = getReferenceDisplay(item);
                      return (
                        <Composer.Chip
                          icon={<ContextChipIcon item={item} />}
                          key={contextItemKey(item)}
                          label={label}
                          onRemove={
                            isQueued
                              ? undefined
                              : () => {
                                  removeContext(item);
                                }
                          }
                          removeLabel={`Remove ${label}`}
                        />
                      );
                    })}
                    {attachments.map((attachment) => {
                      const isImage = isImageMimeType(attachment.mediaType);
                      return (
                        <Composer.Chip
                          icon={
                            isImage ? (
                              <Image
                                alt={attachment.filename}
                                className="size-4 rounded object-cover"
                                height={16}
                                src={attachment.url}
                                width={16}
                              />
                            ) : (
                              <HugeiconsIcon
                                className="text-muted-foreground size-3.5"
                                icon={File02Icon}
                              />
                            )
                          }
                          key={attachment.key}
                          label={attachment.filename}
                          onClick={() => {
                            setPreviewAttachment(attachment);
                          }}
                          onRemove={
                            isQueued
                              ? undefined
                              : () => {
                                  removeAttachment(attachment.key);
                                }
                          }
                        />
                      );
                    })}
                    {pendingUploads.map((pending) => (
                      <Composer.Chip
                        icon={<Loader2Icon className="size-3 animate-spin" />}
                        key={pending.id}
                        label={pending.filename}
                        pending
                      />
                    ))}
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
          <section aria-label="Chat input drop area">
            <input
              accept={allowedChatMimeTypes.join(",")}
              className="hidden"
              multiple
              onChange={onFileInputChange}
              ref={fileInputRef}
              type="file"
            />
            <div className="bg-background relative flex min-w-0 flex-col rounded-t-[13px]">
              <div className="flex w-full min-w-0 items-center rounded-t-[12px]">
                <div className="relative flex min-w-0 flex-1 cursor-text transition-colors [--lh:1lh]">
                  {/* biome-ignore lint/a11y/useSemanticElements: rich mention editor requires a contentEditable host instead of a native textarea. */}
                  <div
                    aria-disabled={isQueued}
                    aria-label="Send a message"
                    aria-multiline="true"
                    className="text-foreground caret-foreground data-[empty=true]:before:text-muted-foreground relative max-h-50 min-h-12 w-full min-w-0 overflow-y-auto rounded-t-[12px] px-3 py-2 text-sm leading-6 wrap-anywhere whitespace-pre-wrap outline-none aria-disabled:cursor-not-allowed aria-disabled:opacity-50 data-[empty=true]:before:pointer-events-none data-[empty=true]:before:absolute data-[empty=true]:before:top-2 data-[empty=true]:before:left-3 data-[empty=true]:before:content-[attr(data-placeholder)]"
                    contentEditable={!isQueued}
                    data-empty={isEmpty ? "true" : "false"}
                    data-placeholder={
                      isLoading
                        ? "Queue a message..."
                        : "Send a message... (type @ for tools and context)"
                    }
                    onBlur={() => {
                      setTimeout(() => {
                        if (
                          !mentionListRef.current?.contains(
                            document.activeElement
                          )
                        ) {
                          setMentionQuery(null);
                          mentionAnchorRef.current = null;
                        }
                      }, 150);
                    }}
                    onCopy={handleCopy}
                    onCut={handleCut}
                    onInput={handleInput}
                    onKeyDown={handleKeyDown}
                    onPaste={handlePaste}
                    ref={editorRef}
                    role="textbox"
                    suppressContentEditableWarning
                    tabIndex={isLoading || isQueued ? -1 : 0}
                  />
                </div>
              </div>
            </div>
            <Composer.Toolbar>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Composer.ToolbarButton
                      aria-label="Attach files"
                      className="size-7 justify-center px-0"
                      disabled={
                        isLoading ||
                        isQueued ||
                        attachments.length + pendingUploads.length >=
                          MAX_CHAT_ATTACHMENTS
                      }
                      onClick={() => fileInputRef.current?.click()}
                    />
                  }
                >
                  <HugeiconsIcon className="size-4" icon={PlusSignIcon} />
                </TooltipTrigger>
                <TooltipContent>{attachmentTooltipText}</TooltipContent>
              </Tooltip>

              <Popover
                modal
                onOpenChange={setIsModelPickerOpen}
                open={isModelPickerOpen}
              >
                <PopoverTrigger
                  render={
                    <Composer.ToolbarButton disabled={isLoading || isQueued} />
                  }
                >
                  <ModelIcon
                    className="size-3.5"
                    provider={currentModel.provider}
                  />
                  {currentModel.label}
                  <HugeiconsIcon className="size-3" icon={ArrowDown01Icon} />
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  className="w-72 p-0"
                  showBackdrop
                  sideOffset={6}
                >
                  <Command>
                    <CommandInput placeholder="Search models..." />
                    <CommandList>
                      <CommandEmpty>No models found.</CommandEmpty>
                      <CommandGroup>
                        {AVAILABLE_MODELS.map((m) => (
                          <CommandItem
                            data-checked={model === m.id}
                            key={m.id}
                            keywords={[m.label, m.provider, m.description]}
                            onSelect={() => {
                              if (
                                m.id === "openai/gpt-5.4" &&
                                attachmentsRef.current.some(
                                  (attachment) =>
                                    !isAllowedChatMimeType(
                                      attachment.mediaType,
                                      m.id
                                    )
                                )
                              ) {
                                toast.error(
                                  getUnsupportedAttachmentMessage(m.label)
                                );
                                return;
                              }
                              onModelChange?.(m.id);
                              setIsModelPickerOpen(false);
                            }}
                            value={m.id}
                          >
                            <ModelIcon
                              className="size-4 shrink-0"
                              provider={m.provider}
                            />
                            <div className="flex min-w-0 flex-col">
                              <span className="text-sm">{m.label}</span>
                              <span className="text-muted-foreground text-xs">
                                {m.description}
                              </span>
                              <span className="text-muted-foreground/70 text-[0.625rem]">
                                {m.pricing}
                              </span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Composer.ToolbarButton disabled={isLoading || isQueued} />
                  }
                >
                  <HugeiconsIcon className="size-3.5" icon={AiBrain01Icon} />
                  {THINKING_LABELS[thinkingLevel]}
                  <HugeiconsIcon className="size-3" icon={ArrowDown01Icon} />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-44">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>Thinking effort</DropdownMenuLabel>
                  </DropdownMenuGroup>
                  {THINKING_LEVELS.map((level) => (
                    <DropdownMenuItem
                      key={level}
                      onClick={() => onThinkingLevelChange?.(level)}
                    >
                      <span className="text-sm capitalize">
                        {level === "off" ? "Off" : THINKING_LABELS[level]}
                      </span>
                      {thinkingLevel === level ? (
                        <HugeiconsIcon
                          className="text-primary ml-auto size-3.5"
                          icon={Tick02Icon}
                        />
                      ) : null}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <Tooltip disabled={isContextPickerOpen}>
                <TooltipTrigger
                  render={
                    contextPickerDisabledReason ? (
                      // biome-ignore lint/a11y/useSemanticElements: a real button would illegally nest the disabled popover trigger button.
                      <span
                        aria-disabled="true"
                        aria-label="Add tools or context"
                        className="inline-flex cursor-not-allowed"
                        role="button"
                        tabIndex={0}
                      />
                    ) : (
                      <span className="inline-flex" />
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
                          disabled={isLoading || isQueued}
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
                          {integrationContextOptions.length > 0 && (
                            <CommandGroup heading="Context">
                              {integrationContextOptions.map((option) => {
                                const inContext = isInContext(
                                  option.contextItem
                                );
                                return (
                                  <CommandItem
                                    data-checked={inContext}
                                    key={option.id}
                                    keywords={[option.searchText]}
                                    onSelect={() => {
                                      if (inContext) {
                                        removeContext(option.contextItem);
                                      } else {
                                        addContext(option);
                                      }
                                      setIsContextPickerOpen(false);
                                    }}
                                    value={option.id}
                                  >
                                    <ChatContextOptionContent option={option} />
                                  </CommandItem>
                                );
                              })}
                            </CommandGroup>
                          )}
                          {mcpToolOptions.length > 0 && (
                            <CommandGroup heading="MCP tools">
                              {mcpToolOptions.map((option) => {
                                const inContext = isInContext(
                                  option.contextItem
                                );
                                return (
                                  <CommandItem
                                    data-checked={inContext}
                                    key={option.id}
                                    keywords={[option.searchText]}
                                    onSelect={() => {
                                      if (inContext) {
                                        removeContext(option.contextItem);
                                      } else {
                                        addContext(option);
                                      }
                                      setIsContextPickerOpen(false);
                                    }}
                                    value={option.id}
                                  >
                                    <ChatContextOptionContent option={option} />
                                  </CommandItem>
                                );
                              })}
                            </CommandGroup>
                          )}
                        </CommandList>
                        {organizationSlug && (
                          <div className="border-border border-t p-1">
                            <Link
                              className="text-muted-foreground hover:bg-accent hover:text-accent-foreground flex items-center rounded-sm px-2 py-1.5 text-sm transition-colors outline-none"
                              href={`/${organizationSlug}/integrations`}
                              onClick={() => setIsContextPickerOpen(false)}
                            >
                              Manage integrations
                            </Link>
                          </div>
                        )}
                      </Command>
                    </PopoverContent>
                  </Popover>
                </TooltipTrigger>
                <TooltipContent>
                  {contextPickerDisabledReason ?? "Tools and context"}
                </TooltipContent>
              </Tooltip>

              {(() => {
                const hasAnyContent =
                  !isEmpty ||
                  attachments.length > 0 ||
                  pendingUploads.length > 0;
                const canQueue =
                  isLoading &&
                  !isEmpty &&
                  attachments.length === 0 &&
                  pendingUploads.length === 0;
                let submitDisabled: boolean;
                if (isQueued) {
                  submitDisabled = false;
                } else if (isLoading && isEmpty) {
                  submitDisabled = !onStop || isStopping;
                } else if (isUsageBlocked) {
                  submitDisabled = true;
                } else if (canQueue) {
                  submitDisabled = false;
                } else {
                  submitDisabled =
                    hasUnsupportedAttachmentsForModel || !hasAnyContent;
                }
                let submitOnClick: (() => void) | undefined;
                if (isQueued) {
                  submitOnClick = () => setPendingSend(null);
                } else if (isLoading && isEmpty) {
                  submitOnClick = onStop;
                } else {
                  submitOnClick = handleSend;
                }
                const sendBusy = Boolean(isLoading && isStopping);
                let sendIcon = (
                  <HugeiconsIcon
                    className="size-4"
                    icon={ArrowUp02Icon}
                    strokeWidth={2}
                  />
                );
                if (isQueued) {
                  sendIcon = <Loader2Icon className="size-4 animate-spin" />;
                } else if (isLoading && isEmpty) {
                  sendIcon = (
                    <HugeiconsIcon className="size-4" icon={StopIcon} />
                  );
                }
                let sendLabel = "Send message";
                if (isLoading && isEmpty) {
                  sendLabel = "Stop generating";
                } else if (canQueue) {
                  sendLabel = "Queue message";
                }
                return (
                  <Composer.Send
                    busy={sendBusy}
                    disabled={submitDisabled}
                    label={sendLabel}
                    onClick={submitOnClick}
                    tooltip={getSubmitTooltipText({
                      canQueue,
                      isEmpty,
                      isLoading,
                      isQueued,
                      isStopping,
                      isUsageBlocked,
                    })}
                  >
                    {sendIcon}
                  </Composer.Send>
                );
              })()}
            </Composer.Toolbar>
          </section>
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
}
