"use client";

import { Clock01Icon, CpuIcon, FlashIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ChatModel, ThinkingLevel } from "@notra/ai/types/chat";
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
import type {
  AssistantMetadataHoverProps,
  AssistantTokenUsageProps,
} from "@/types/components/assistant-metadata";

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

function AssistantTokenUsage({
  metadata,
  outputTokens,
}: AssistantTokenUsageProps) {
  const contextWindow = metadata.model
    ? getModelContextWindow(metadata.model)
    : null;

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <div className="flex cursor-default items-center gap-1">
            <HugeiconsIcon className="size-3" icon={CpuIcon} />
            <span>{formatTokens(outputTokens)} tokens</span>
          </div>
        }
      />
      <TooltipContent>
        <div className="flex flex-col gap-0.5 text-xs">
          {typeof metadata.inputTokens === "number" ? (
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Input</span>
              <span>{metadata.inputTokens.toLocaleString("en-US")}</span>
            </div>
          ) : null}
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Output</span>
            <span>{outputTokens.toLocaleString("en-US")}</span>
          </div>
          {contextWindow !== null ? (
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Context</span>
              <span>{formatContextWindow(contextWindow)}</span>
            </div>
          ) : null}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

export function AssistantMetadataHover({
  metadata,
  compact = false,
}: AssistantMetadataHoverProps) {
  const { showAgentStats } = useShowAgentStats();
  const showStats = showAgentStats && !compact;

  if (!metadata) {
    return null;
  }

  const items: ReactNode[] = [];

  if (metadata.model) {
    const modelLabel = getModelLabel(metadata.model);
    const thinkingLabel =
      !compact && metadata.thinkingLevel
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

  if (showStats && typeof metadata.tokensPerSecond === "number") {
    items.push(
      <div className="flex items-center gap-1" key="tps">
        <HugeiconsIcon className="size-3" icon={FlashIcon} />
        <span>{metadata.tokensPerSecond.toFixed(2)} tok/sec</span>
      </div>
    );
  }

  if (showStats && typeof metadata.outputTokens === "number") {
    items.push(
      <AssistantTokenUsage
        key="tokens"
        metadata={metadata}
        outputTokens={metadata.outputTokens}
      />
    );
  }

  if (showStats && typeof metadata.ttftMs === "number") {
    items.push(
      <div className="flex min-w-0 items-center gap-1" key="ttft">
        <HugeiconsIcon className="size-3" icon={Clock01Icon} />
        <span className="truncate">
          Time to First Token: {formatDuration(metadata.ttftMs)}
        </span>
      </div>
    );
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <div
      className="text-muted-foreground duration-fast absolute top-full left-0 flex max-w-full items-center gap-3 overflow-clip pt-1 text-xs whitespace-nowrap opacity-0 transition-opacity group-focus-within/message:opacity-100 group-hover/message:opacity-100 motion-reduce:transition-none [&>div:not(:last-child)]:shrink-0 [@media(hover:none)]:opacity-100"
      data-chat-quote-ignore
    >
      {items}
    </div>
  );
}
