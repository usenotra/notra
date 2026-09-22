import type {
  ChatAttachment,
  ChatModel,
  ContextItem,
  TextSelection,
} from "@notra/ai/types/chat";

import type { QueuedMessage } from "@/components/chat/chat-queue";
import type { GitHubRepository } from "@/types/integrations";

export type ChatModelProvider = "anthropic" | "openai" | "auto";

export interface ChatModelOption {
  id: ChatModel;
  label: string;
  description: string;
  pricing: string;
  provider: ChatModelProvider;
  beta?: boolean;
}

export interface ChatInputProps {
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

export interface ChatContextOptionContentProps {
  option: ChatContextOption;
}

export type ChatContextSuggestedIntegrationId = "github" | "linear" | "mcp";

export interface ChatContextSuggestedIntegration {
  id: ChatContextSuggestedIntegrationId;
  name: string;
  description: string;
  href: string;
  keywords: readonly string[];
}

export interface ChatContextConnectSuggestionsProps {
  organizationSlug: string;
  onSelect: () => void;
}
