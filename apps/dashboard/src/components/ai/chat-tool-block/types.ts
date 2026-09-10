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
