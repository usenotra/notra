import type { ChatMessageMetadata } from "@notra/ai/types/chat";
import type { UIMessage } from "ai";
import type { ReactNode } from "react";

export interface ChatActivityStatusProps {
  children?: ReactNode;
  seconds: number;
  label?: string;
  active?: boolean;
}

export interface ChatActivityGroupProps {
  children: ReactNode;
  durationMs?: number;
  elapsedSeconds?: number;
  forceOpen?: boolean;
  groupId: string;
  hasDetails: boolean;
  isLoading: boolean;
  isStreaming: boolean;
  step: string;
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
  activityTimings?: ChatMessageMetadata["activityTimings"];
  durationMs?: number;
  elapsedSeconds?: number;
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
