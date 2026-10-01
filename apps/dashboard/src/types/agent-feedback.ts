import type { agentFeedback } from "@notra/db/schema";
import type {
  AgentFeedbackKind,
  AgentFeedbackSentiment,
  AgentFeedbackStatus,
} from "@notra/db/types/agent-feedback";
import type { ReactNode } from "react";

import type { AuthenticatedUser } from "@/types/auth/organization";

export type AgentFeedbackClientBrand =
  | "claude"
  | "cursor"
  | "openai"
  | "vercel"
  | "windsurf"
  | "amp"
  | "playwright"
  | "notra"
  | "cline"
  | "devin"
  | "copilot"
  | "gemini";

export interface AgentFeedbackClientBrandRule {
  brand: AgentFeedbackClientBrand;
  aliases: readonly string[];
}

export type AgentFeedbackRow = typeof agentFeedback.$inferSelect;

export type AgentFeedbackItem = Omit<
  AgentFeedbackRow,
  "createdAt" | "updatedAt" | "resolvedAt"
> & {
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
};

export type AgentFeedbackStatusFilter = AgentFeedbackStatus | "all";

export interface AgentFeedbackListResponse {
  items: AgentFeedbackItem[];
  nextCursor: string | null;
  /** Only set on the first page. */
  counts: Record<AgentFeedbackStatus, number> | null;
}

export interface AgentFeedbackStatusChange {
  feedbackId: string;
  previousStatus: AgentFeedbackStatus;
  status: AgentFeedbackStatus;
}

export interface AgentFeedbackListData {
  pages: AgentFeedbackListResponse[];
  pageParams: unknown[];
}

export type AgentFeedbackSnippetKey = "mcp" | "fetch" | "curl";

export type AgentFeedbackSetupSnippets = Record<
  AgentFeedbackSnippetKey,
  string
>;

export interface AgentFeedbackSetupResponse {
  apiUrl: string;
  prompt: string;
  snippets: AgentFeedbackSetupSnippets;
}

export interface AgentFeedbackSetupPanelProps {
  setup: AgentFeedbackSetupResponse | undefined;
  className?: string;
  showPromptAction?: boolean;
}

export interface AgentFeedbackEmptyProps {
  organizationId: string;
}

export interface AgentFeedbackSetupSource {
  organizationName: string;
  organizationSlug: string;
}

export interface AgentFeedbackListInput {
  organizationId: string;
  status?: AgentFeedbackStatus;
  kind?: AgentFeedbackKind;
  cursor?: string;
  limit?: number;
}

export interface AgentFeedbackTableProps {
  emptyState?: ReactNode;
  items: AgentFeedbackItem[];
  isPending: boolean;
  isDeleting: boolean;
  isUpdatingStatus: boolean;
  selectedId: string | null;
  onSelect: (item: AgentFeedbackItem) => void;
  onStatusChange: (
    item: AgentFeedbackItem,
    status: AgentFeedbackStatus
  ) => void;
  onDelete: (item: AgentFeedbackItem) => void;
}

export interface AgentFeedbackDetailDialogProps {
  item: AgentFeedbackItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChange: (status: AgentFeedbackStatus) => void;
  onDelete: () => void;
  /** Blocks further status changes until the pending one settles. */
  isUpdating: boolean;
}

export interface AgentFeedbackSetupCardProps {
  organizationId: string;
}

export interface AgentFeedbackStatusBadgeProps {
  status: AgentFeedbackStatus;
  showLabel?: boolean;
}

export interface AgentFeedbackKindBadgeProps {
  kind: AgentFeedbackKind;
}

export interface AgentFeedbackSentimentLabelProps {
  sentiment: AgentFeedbackSentiment | null;
}

export interface AgentFeedbackAgentIconProps {
  client: string | null;
  className?: string;
}

export interface AgentFeedbackAgentProps {
  client: string | null;
  className?: string;
}

export interface AgentFeedbackStatusIconProps {
  status: AgentFeedbackStatus;
  className?: string;
}

export interface AgentFeedbackPageClientProps {
  organizationSlug: string;
}

export interface AgentFeedbackHandlerOptions<TInput> {
  context: { headers: Headers; user?: AuthenticatedUser };
  input: TInput;
}

export interface AgentFeedbackUpdateStatusInput {
  organizationId: string;
  feedbackId: string;
  status: AgentFeedbackStatus;
}

export interface AgentFeedbackDeleteInput {
  organizationId: string;
  feedbackId: string;
}

export interface AgentFeedbackCursor {
  createdAt: Date;
  id: string;
}

export interface AgentFeedbackDetailRow {
  key: string;
  label: string;
  value: ReactNode;
}

export interface AgentFeedbackSetupDialogProps {
  organizationId: string;
}
