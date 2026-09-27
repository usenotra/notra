import type { useTranslations } from "next-intl";

export type ToolBlockTranslator = ReturnType<
  typeof useTranslations<"ai.toolBlock">
>;

export interface ToolCopy {
  subtitle?: (params: {
    input: unknown;
    output: unknown;
    isStreaming: boolean;
    isError: boolean;
    t: ToolBlockTranslator;
  }) => string | undefined;
  suffix?: (
    input: unknown,
    output: unknown,
    t: ToolBlockTranslator
  ) => string | undefined;
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
