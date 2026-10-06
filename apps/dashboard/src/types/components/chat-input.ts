import type {
  ChatAttachment,
  ChatInputHandle,
  ChatModel,
  ContextItem,
  TextSelection,
} from "@notra/ai/types/chat";
import type { Ref } from "react";

import type { QueuedMessage } from "@/components/chat/chat-queue";
import type { PendingChatUpload } from "@/types/hooks/chat-composer-attachments";
import type { GitHubRepository } from "@/types/integrations";
import type { SkillSlashOption } from "@/types/skills/slash";

export type ChatModelProvider = "anthropic" | "openai" | "auto";

export type ChatModelDescriptionKey =
  | "auto"
  | "latestOpus"
  | "everyday"
  | "fast"
  | "advancedReasoning"
  | "fastAffordable"
  | "zdrRoute"
  | "previousOpus"
  | "previousSonnet"
  | "previousOpenai";

export interface ChatModelPricing {
  input: string;
  output: string;
}

export interface ChatModelOption {
  id: ChatModel;
  label: string;
  description: ChatModelDescriptionKey | null;
  pricing: ChatModelPricing | "varies" | null;
  provider: ChatModelProvider;
  beta?: boolean;
}

export type ContentChatInputHandle = Pick<ChatInputHandle, "setAttachments">;

export interface ChatInputProps {
  ref?: Ref<ContentChatInputHandle>;
  onSend?: (value: string, attachments: ChatAttachment[]) => void;
  onStop?: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  selection?: TextSelection | null;
  onClearSelection?: () => void;
  organizationSlug?: string;
  organizationId?: string;
  context?: ContextItem[];
  onAddContext?: (item: ContextItem) => void;
  onRemoveContext?: (item: ContextItem) => void;
  value?: string;
  onValueChange?: (value: string) => void;
  error?: string | null;
  onClearError?: () => void;
  connectedTop?: boolean;
  placeholder?: string;
  queuedMessages?: QueuedMessage[];
  onEditQueued?: (message: QueuedMessage) => void;
  onRemoveQueued?: (id: string) => void;
  onSteerQueued?: (message: QueuedMessage) => void;
}

export type EnabledRepo = GitHubRepository & { integrationId: string };

export interface EnabledLinear {
  id: string;
  displayName: string;
  integrationId: string;
  teamName?: string | null;
}

export interface ChatInputContextRowProps {
  context: ContextItem[];
  selection?: TextSelection | null;
  onRemoveContext?: (item: ContextItem) => void;
  onClearSelection?: () => void;
}

export type ChatContextOptionKind = "github" | "linear" | "mcp";

export interface ChatContextOption {
  id: string;
  kind: ChatContextOptionKind;
  label: string;
  description: string;
  searchText: string;
  contextItem: ContextItem;
  logoLightUrl?: string | null;
  logoDarkUrl?: string | null;
}

export interface ChatInputContextPickerProps {
  contextOptions: ChatContextOption[];
  contextPickerId: string;
  disabledReason: string | null;
  isInContext: (item: ContextItem) => boolean;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  organizationSlug?: string;
  toggleContextItem: (item: ContextItem, inContext: boolean) => void;
}

export interface ChatInputComposerNudgeProps {
  attachments: ChatAttachment[];
  context: ContextItem[];
  hasAttachmentChips: boolean;
  hasContextChips: boolean;
  onClearSelection?: () => void;
  onEditQueued?: (message: QueuedMessage) => void;
  onRemoveContext?: (item: ContextItem) => void;
  onRemoveQueued?: (id: string) => void;
  onSteerQueued?: (message: QueuedMessage) => void;
  organizationSlug?: string;
  pendingUploads: PendingChatUpload[];
  queuedMessages: QueuedMessage[];
  remainingChatCredits: number | null;
  removeAttachment: (key: string) => void;
  selection?: TextSelection | null;
  setPreviewAttachment: (attachment: ChatAttachment) => void;
  shouldShowLowCredits: boolean;
  taggedSkills: SkillSlashOption[];
  untagSkill: (name: string) => void;
  usageLimitError: string | null;
}

export interface ChatContextOptionContentProps {
  option: ChatContextOption;
}

export type ChatContextSuggestedIntegrationId = "github" | "linear" | "mcp";

export interface ChatContextSuggestedIntegration {
  id: ChatContextSuggestedIntegrationId;
  name: string;
  href: string;
  keywords: readonly string[];
}

export interface ChatContextConnectSuggestionsProps {
  organizationSlug: string;
  onSelect: () => void;
}

export interface ChatFileAttachmentProps {
  url: string;
  filename?: string;
  mediaType?: string;
}
