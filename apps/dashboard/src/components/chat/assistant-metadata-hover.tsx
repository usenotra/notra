"use client";

import { Clock01Icon, CpuIcon, FlashIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ChatMessageMetadata, ChatModel } from "@notra/ai/types/chat";
import { ClaudeAiIcon } from "@notra/ui/components/ui/svgs/claudeAiIcon";
import { Openai } from "@notra/ui/components/ui/svgs/openai";
import { OpenaiDark } from "@notra/ui/components/ui/svgs/openaiDark";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import { cn } from "@notra/ui/lib/utils";
import { useLocale, useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { useShowAgentStats } from "@/lib/hooks/use-privacy-preferences";
import { formatOneDecimal } from "@/utils/format";

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

function formatCompactTokens(tokens: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(tokens);
}

function getModelLabel(model: string): string {
  return MODEL_LABELS[model as ChatModel] ?? model;
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
  const t = useTranslations("chat.metadata");
  const tCommon = useTranslations("common");
  const tChatShared = useTranslations("chat.shared");
  const locale = useLocale();
  const { showAgentStats } = useShowAgentStats();

  if (!metadata) {
    return null;
  }

  const items: ReactNode[] = [];

  if (metadata.model) {
    const modelLabel = getModelLabel(metadata.model);
    const thinkingLabel =
      metadata.thinkingLevel && metadata.thinkingLevel !== "off"
        ? tCommon(`labels.${metadata.thinkingLevel}`)
        : null;

    items.push(
      <div className="flex items-center gap-1.5" key="model">
        <ModelBadgeIcon model={metadata.model} />
        <span>
          {thinkingLabel
            ? t("modelWithThinking", {
                model: modelLabel,
                thinking: thinkingLabel,
              })
            : modelLabel}
        </span>
      </div>
    );
  }

  if (showAgentStats && typeof metadata.tokensPerSecond === "number") {
    items.push(
      <div className="flex items-center gap-1" key="tps">
        <HugeiconsIcon className="size-3" icon={FlashIcon} />
        <span>
          {t("tokensPerSecond", {
            value: new Intl.NumberFormat(locale, {
              maximumFractionDigits: 2,
            }).format(metadata.tokensPerSecond),
          })}
        </span>
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
              <span>
                {t("tokens", {
                  value: formatCompactTokens(metadata.outputTokens, locale),
                })}
              </span>
            </div>
          }
        />
        {hasBreakdown ? (
          <TooltipContent>
            <div className="flex flex-col gap-0.5 text-xs">
              {typeof metadata.inputTokens === "number" ? (
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">
                    {tCommon("labels.input")}
                  </span>
                  <span>{metadata.inputTokens.toLocaleString(locale)}</span>
                </div>
              ) : null}
              {typeof metadata.outputTokens === "number" ? (
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">
                    {tCommon("labels.output")}
                  </span>
                  <span>{metadata.outputTokens.toLocaleString(locale)}</span>
                </div>
              ) : null}
              {contextWindow !== null ? (
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">
                    {tChatShared("context")}
                  </span>
                  <span>{formatCompactTokens(contextWindow, locale)}</span>
                </div>
              ) : null}
            </div>
          </TooltipContent>
        ) : null}
      </Tooltip>
    );
  }

  if (showAgentStats && typeof metadata.ttftMs === "number") {
    const ttftSeconds = metadata.ttftMs / 1000;
    let duration = t("durationSec", { value: Math.round(ttftSeconds) });
    if (metadata.ttftMs < 1000) {
      duration = t("durationMs", { value: Math.round(metadata.ttftMs) });
    } else if (ttftSeconds < 10) {
      duration = t("durationSec", {
        value: formatOneDecimal(ttftSeconds, locale),
      });
    }
    items.push(
      <div className="flex items-center gap-1" key="ttft">
        <HugeiconsIcon className="size-3" icon={Clock01Icon} />
        <span>{t("timeToFirstToken", { duration })}</span>
      </div>
    );
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "text-muted-foreground mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs",
        showAgentStats
          ? "opacity-100"
          : "duration-fast opacity-0 transition-opacity group-hover:opacity-100"
      )}
    >
      {items}
    </div>
  );
}
