import type { ChatToolBlockVisuals } from "./visuals";

export interface ToolCopy {
  verbs: readonly [present: string, past: string];
  noun: string;
  subtitle?: (params: {
    input: unknown;
    output: unknown;
    isStreaming: boolean;
    isError: boolean;
  }) => string | undefined;
  suffix?: (input: unknown, output: unknown) => string | undefined;
}

export interface ChatToolBlockProps {
  toolCallId: string;
  toolName: string;
  state: string;
  isActive: boolean;
  input?: unknown;
  output?: unknown;
  onApprove?: () => void;
  onDeny?: () => void;
  editorHref?: string;
  isMcp?: boolean;
  iconUrl?: string;
  mcpLogoDarkUrl?: string | null;
  mcpLogoLightUrl?: string | null;
  toolMetadata?: unknown;
}

export type ChatToolIconProps = Pick<
  ChatToolBlockProps,
  | "iconUrl"
  | "isMcp"
  | "mcpLogoDarkUrl"
  | "mcpLogoLightUrl"
  | "toolMetadata"
  | "toolName"
> & { isError: boolean };

export type ToolDetailsProps = Pick<
  ChatToolBlockProps,
  "input" | "onApprove" | "onDeny"
> & {
  output: unknown;
  hasApprovalActions: boolean;
  showJsonDetails: boolean;
  showJsonInput: boolean;
  showJsonOutput: boolean;
};

export type ChatToolContentProps = Pick<
  ChatToolBlockProps,
  "editorHref" | "input" | "onApprove" | "onDeny" | "output" | "toolName"
> & {
  isAwaitingApproval: boolean;
  isStreaming: boolean;
  visuals: ChatToolBlockVisuals;
};

export type ChatToolTriggerProps = ChatToolIconProps & {
  isOpen: boolean;
  isStreaming: boolean;
  hasDetails: boolean;
  subtitle: string;
  elapsedSeconds: number;
  showElapsedTimer: boolean;
};
