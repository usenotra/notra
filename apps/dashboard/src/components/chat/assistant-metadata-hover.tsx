"use client";

import { Clock01Icon, CpuIcon, FlashIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ChatModel } from "@notra/ai/types/chat";
import {
  DetailCardContent,
  DetailCardRow,
} from "@notra/ui/components/ui/detail-card";
import {
  HoverCard,
  HoverCardTrigger,
} from "@notra/ui/components/ui/hover-card";
import { ClaudeAiIcon } from "@notra/ui/components/ui/svgs/claudeAiIcon";
import { Openai } from "@notra/ui/components/ui/svgs/openai";
import { OpenaiDark } from "@notra/ui/components/ui/svgs/openaiDark";
import type { ReactNode } from "react";
import { useLocale, useTranslations } from "use-intl";

import { useShowAgentStats } from "@/lib/hooks/use-privacy-preferences";
import type {
  AssistantMetadataHoverProps,
  AssistantTokenUsageProps,
} from "@/types/components/assistant-metadata";
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

function AssistantTokenUsage({
  metadata,
  outputTokens,
}: AssistantTokenUsageProps) {
  const t = useTranslations("chat.metadata");
  const tCommon = useTranslations("common");
  const tChatShared = useTranslations("chat.shared");
  const locale = useLocale();
  const contextWindow = metadata.model
    ? getModelContextWindow(metadata.model)
    : null;

  const tokensLabel = t("tokens", {
    value: formatCompactTokens(outputTokens, locale),
  });

  return (
    <HoverCard>
      <HoverCardTrigger
        render={
          <div className="flex cursor-default items-center gap-1">
            <HugeiconsIcon className="size-3" icon={CpuIcon} />
            <span>{tokensLabel}</span>
          </div>
        }
      />
      <DetailCardContent
        icon={
          metadata.model ? <ModelBadgeIcon model={metadata.model} /> : undefined
        }
        title={metadata.model ? getModelLabel(metadata.model) : tokensLabel}
      >
        <dl className="flex flex-col">
          {typeof metadata.inputTokens === "number" ? (
            <DetailCardRow label={tCommon("labels.input")}>
              {metadata.inputTokens.toLocaleString(locale)}
            </DetailCardRow>
          ) : null}
          <DetailCardRow label={tCommon("labels.output")}>
            {outputTokens.toLocaleString(locale)}
          </DetailCardRow>
          {contextWindow !== null ? (
            <DetailCardRow label={tChatShared("context")}>
              {formatCompactTokens(contextWindow, locale)}
            </DetailCardRow>
          ) : null}
        </dl>
      </DetailCardContent>
    </HoverCard>
  );
}

export function AssistantMetadataHover({
  metadata,
  compact = false,
}: AssistantMetadataHoverProps) {
  const t = useTranslations("chat.metadata");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const { showAgentStats } = useShowAgentStats();
  const showStats = showAgentStats && !compact;

  if (!metadata) {
    return null;
  }

  const items: ReactNode[] = [];

  if (metadata.model) {
    const modelLabel = getModelLabel(metadata.model);
    const thinkingLabel =
      !compact && metadata.thinkingLevel && metadata.thinkingLevel !== "off"
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

  if (showStats && typeof metadata.tokensPerSecond === "number") {
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
      <div className="flex min-w-0 items-center gap-1" key="ttft">
        <HugeiconsIcon className="size-3 shrink-0" icon={Clock01Icon} />
        <span className="truncate">{t("timeToFirstToken", { duration })}</span>
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
