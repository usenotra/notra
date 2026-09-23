import type { UIMessage } from "ai";
import type { ReactNode } from "react";

export interface ChatActivityGroupProps {
  children: ReactNode;
  durationMs?: number;
  forceOpen?: boolean;
  groupId: string;
  isStreaming: boolean;
}

export interface ChatSearchStackProps {
  items: Array<{
    input: unknown;
    output: unknown;
    state: string;
    toolCallId: string;
  }>;
}

export interface ChatAssistantPartsProps {
  durationMs?: number;
  isLoading: boolean;
  isStandaloneTool?: (part: UIMessage["parts"][number]) => boolean;
  messageId: string;
  parts: UIMessage["parts"];
  renderStandalone: (
    part: UIMessage["parts"][number],
    index: number
  ) => ReactNode;
  renderTool: (part: UIMessage["parts"][number], index: number) => ReactNode;
}
