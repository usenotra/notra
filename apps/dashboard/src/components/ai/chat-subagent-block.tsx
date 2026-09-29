"use client";

import {
  ArrowDown01Icon,
  ArrowMoveDownRightIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Shimmer } from "@notra/ui/components/ai-elements/shimmer";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@notra/ui/components/ui/collapsible";
import { cn } from "@notra/ui/lib/utils";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { ACTIVITY_CONTENT_CLASSNAME } from "@/constants/chat-activity";
import {
  CHAT_SUBAGENT_FALLBACK,
  CHAT_SUBAGENTS,
} from "@/constants/chat-subagents";
import { useElapsedSeconds } from "@/lib/hooks/use-elapsed-seconds";
import type {
  ChatSubagentBlockProps,
  ChatSubagentResult,
} from "@/types/components/chat-subagent-block";
import {
  getChatSubagentResult,
  isChatSubagentName,
  isSkippedSubagentOutput,
} from "@/utils/chat-subagents";
import { formatElapsedSeconds } from "@/utils/format-elapsed-seconds";

type SubagentOutcome = "running" | "done" | "failed" | "skipped";

function getOutcome(params: {
  isStreaming: boolean;
  isError: boolean;
  isSkipped: boolean;
}): SubagentOutcome {
  if (params.isStreaming) {
    return "running";
  }
  if (params.isError) {
    return "failed";
  }
  return params.isSkipped ? "skipped" : "done";
}

function describeResult(
  result: ChatSubagentResult | null,
  errorText: string | undefined,
  t: ReturnType<typeof useTranslations<"ai.subagent">>
): string | null {
  if (errorText) {
    return errorText;
  }
  if (!result) {
    return null;
  }
  switch (result.kind) {
    case "brief":
      return t("result.brief", { feature: result.feature });
    case "draft":
      return result.title
        ? t("result.draft", { title: result.title })
        : t("result.draftUntitled");
    case "skipped":
      return result.reason
        ? t("result.skipped", { reason: result.reason })
        : t("result.skippedUnknown");
    default: {
      const exhaustive: never = result;
      return exhaustive;
    }
  }
}

/**
 * A delegated subagent run, styled like the chat's activity rows: one muted
 * line with the agent's name and progress, its own tool calls hanging off
 * the same guide line the activity group uses, and the result as last line.
 */
export function ChatSubagentBlock({
  agentName,
  toolCallId,
  state,
  isActive,
  output,
  errorText,
  children,
  stepCount,
  defaultOpen = true,
}: ChatSubagentBlockProps) {
  const t = useTranslations("ai.subagent");
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const config = isChatSubagentName(agentName)
    ? (CHAT_SUBAGENTS[agentName] ?? CHAT_SUBAGENT_FALLBACK)
    : CHAT_SUBAGENT_FALLBACK;
  const isError = state === "output-error" || Boolean(errorText);
  const isPending = state === "input-streaming" || state === "input-available";
  const isStreaming = isActive && isPending;
  const elapsedSeconds = useElapsedSeconds(isStreaming, toolCallId);
  const outcome = getOutcome({
    isStreaming,
    isError,
    isSkipped: !isPending && isSkippedSubagentOutput(output),
  });
  const activity = t(`activity.${config.labelKey}`, { state: outcome });
  const summary = isPending
    ? null
    : describeResult(getChatSubagentResult(agentName, output), errorText, t);
  const hasBody = Boolean(children) || Boolean(summary);

  return (
    <Collapsible onOpenChange={setIsOpen} open={hasBody && isOpen}>
      <CollapsibleTrigger
        className={cn(
          "group flex w-full min-w-0 items-center gap-2 text-sm transition-colors disabled:cursor-default",
          outcome === "failed"
            ? "text-destructive"
            : "text-muted-foreground hover:text-foreground"
        )}
        disabled={!hasBody}
      >
        <HugeiconsIcon
          aria-hidden
          className="size-3.5 shrink-0"
          icon={config.icon}
          strokeWidth={1.8}
        />
        <span className="min-w-0 truncate leading-5">
          <span className="text-foreground">
            {t(`names.${config.labelKey}`)}
          </span>
          <span aria-hidden className="text-muted-foreground/50">
            {" · "}
          </span>
          {isStreaming ? <Shimmer as="span">{activity}</Shimmer> : activity}
        </span>
        <span className="text-muted-foreground/60 shrink-0 text-xs tabular-nums">
          {isStreaming ? formatElapsedSeconds(elapsedSeconds) : null}
          {!isStreaming && stepCount !== undefined
            ? t("steps", { count: stepCount })
            : null}
        </span>
        {hasBody ? (
          <HugeiconsIcon
            aria-hidden
            className={cn(
              "text-muted-foreground/60 size-3.5 shrink-0 transition-transform motion-reduce:transition-none",
              isOpen
                ? "rotate-180"
                : "rotate-0 opacity-0 group-hover:opacity-100"
            )}
            icon={ArrowDown01Icon}
          />
        ) : null}
      </CollapsibleTrigger>
      <CollapsibleContent className={ACTIVITY_CONTENT_CLASSNAME}>
        <div className="border-border/70 mt-2 ml-1.5 flex min-w-0 flex-col gap-2 border-l pl-3">
          {children}
          {summary ? (
            <div className="text-muted-foreground flex min-w-0 items-start gap-2 text-sm leading-5">
              <HugeiconsIcon
                aria-hidden
                className="mt-0.75 size-3.5 shrink-0"
                icon={ArrowMoveDownRightIcon}
                strokeWidth={1.8}
              />
              <span className="min-w-0 text-pretty">{summary}</span>
            </div>
          ) : null}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
