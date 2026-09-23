"use client";

import { Clock01Icon, CpuIcon, FlashIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type {
  ChatMessageMetadata,
  ChatModel,
  ThinkingLevel,
} from "@notra/ai/types/chat";
import { ClaudeAiIcon } from "@notra/ui/components/ui/svgs/claudeAiIcon";
import { Openai } from "@notra/ui/components/ui/svgs/openai";
import { OpenaiDark } from "@notra/ui/components/ui/svgs/openaiDark";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import type { ReactNode } from "react";

import { useShowAgentStats } from "@/lib/hooks/use-privacy-preferences";

const MODEL_LABELS = {
  auto: "Auto",
  "anthropic/claude-opus-5.5": "Claude Opus 5.5",
  "anthropic/claude-opus-5": "Claude Opus 5",
  "anthropic/claude-opus-4.8": "Claude Opus 4.8",
  "anthropic/claude-sonnet-5": "Claude Sonnet 5",
  "anthropic/claude-sonnet-4.6": "Claude Sonnet 4.6",
  "anthropic/claude-haiku-4.5": "Claude Haiku 4.5",
  "openai/gpt-5.4": "GPT-5.4",
  "openai/gpt-5.5": "GPT-5.5",
  "openai/gpt-6-sol": "GPT-6 Sol",
  "openai/gpt-6-luna": "GPT-6 Luna",
  "openai/gpt-5.6-sol": "GPT-5.6 Sol",
} satisfies Record<ChatModel, string>;

const MODEL_CONTEXT_WINDOWS = {
  auto: 1_000_000,
  "anthropic/claude-opus-5.5": 1_000_000,
  "anthropic/claude-opus-5": 1_000_000,
  "anthropic/claude-opus-4.8": 1_000_000,
  "anthropic/claude-sonnet-5": 1_000_000,
  "anthropic/claude-sonnet-4.6": 1_000_000,
  "anthropic/claude-haiku-4.5": 200_000,
  "openai/gpt-5.4": 1_100_000,
  "openai/gpt-5.5": 272_000,
  "openai/gpt-6-sol": 1_050_000,
  "openai/gpt-6-luna": 1_050_000,
  "openai/gpt-5.6-sol": 1_050_000,
} satisfies Record<ChatModel, number>;

function getModelContextWindow(model: string): number | null {
  return MODEL_CONTEXT_WINDOWS[model as ChatModel] ?? null;
}

function formatContextWindow(tokens: number): string {
  if (tokens >= 1_000_000) {
    const millions = tokens / 1_000_000;
    return `${Number.isInteger(millions) ? millions : millions.toFixed(1)}M`;
  }
  if (tokens >= 1000) {
    return `${Math.round(tokens / 1000)}K`;
  }
  return String(tokens);
}

const THINKING_LEVEL_LABELS: Record<ThinkingLevel, string | null> = {
  off: null,
  low: "Low",
  medium: "Medium",
  high: "High",
};

function getModelLabel(model: string): string {
  return MODEL_LABELS[model as ChatModel] ?? model;
}

function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${Math.round(ms)} ms`;
  }
  const seconds = ms / 1000;
  if (seconds < 10) {
    return `${seconds.toFixed(1)} sec`;
  }
  return `${Math.round(seconds)} sec`;
}

function formatTokens(tokens: number): string {
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}k`;
  }
  return String(tokens);
}

function ModelBadgeIcon({ model }: { model: string }) {
  if (model.startsWith("openai/")) {
    return (
      <>
        <Openai className="block size-3 dark:hidden" />
        <OpenaiDark className="hidden size-3 dark:block" />
      </>
    );
  }
  return <ClaudeAiIcon className="size-3" />;
}

interface AssistantMetadataHoverProps {
  metadata: ChatMessageMetadata | undefined;
}

export function AssistantMetadataHover({
  metadata,
}: AssistantMetadataHoverProps) {
  const { showAgentStats } = useShowAgentStats();

  if (!metadata) {
    return null;
  }

  const items: ReactNode[] = [];

  if (metadata.model) {
    const modelLabel = getModelLabel(metadata.model);
    const thinkingLabel = metadata.thinkingLevel
      ? THINKING_LEVEL_LABELS[metadata.thinkingLevel]
      : null;

    items.push(
      <div className="flex items-center gap-1.5" key="model">
        <ModelBadgeIcon model={metadata.model} />
        <span>
          {modelLabel}
          {thinkingLabel ? ` (${thinkingLabel})` : ""}
        </span>
      </div>
    );
  }

  if (showAgentStats && typeof metadata.tokensPerSecond === "number") {
    items.push(
      <div className="flex items-center gap-1" key="tps">
        <HugeiconsIcon className="size-3" icon={FlashIcon} />
        <span>{metadata.tokensPerSecond.toFixed(2)} tok/sec</span>
      </div>
    );
  }

  if (showAgentStats && typeof metadata.outputTokens === "number") {
    const contextWindow = metadata.model
      ? getModelContextWindow(metadata.model)
      : null;
    const hasBreakdown =
      typeof metadata.inputTokens === "number" ||
      typeof metadata.outputTokens === "number" ||
      contextWindow !== null;

    items.push(
      <Tooltip key="tokens">
        <TooltipTrigger
          render={
            <div className="flex cursor-default items-center gap-1">
              <HugeiconsIcon className="size-3" icon={CpuIcon} />
              <span>{formatTokens(metadata.outputTokens)} tokens</span>
            </div>
          }
        />
        {hasBreakdown ? (
          <TooltipContent>
            <div className="flex flex-col gap-0.5 text-xs">
              {typeof metadata.inputTokens === "number" ? (
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Input</span>
                  <span>{metadata.inputTokens.toLocaleString()}</span>
                </div>
              ) : null}
              {typeof metadata.outputTokens === "number" ? (
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Output</span>
                  <span>{metadata.outputTokens.toLocaleString()}</span>
                </div>
              ) : null}
              {contextWindow !== null ? (
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Context</span>
                  <span>{formatContextWindow(contextWindow)}</span>
                </div>
              ) : null}
            </div>
          </TooltipContent>
        ) : null}
      </Tooltip>
    );
  }

  if (showAgentStats && typeof metadata.ttftMs === "number") {
    items.push(
      <div className="flex items-center gap-1" key="ttft">
        <HugeiconsIcon className="size-3" icon={Clock01Icon} />
        <span>Time to First Token: {formatDuration(metadata.ttftMs)}</span>
      </div>
    );
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="text-muted-foreground duration-fast mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs opacity-0 transition-opacity group-hover:opacity-100">
      {items}
    </div>
  );
}
