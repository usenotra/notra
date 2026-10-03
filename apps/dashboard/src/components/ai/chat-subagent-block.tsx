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
import { useState } from "react";
import { useTranslations } from "use-intl";

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
} from "@/utils/chat-subagents";
import { formatElapsedSeconds } from "@/utils/format-elapsed-seconds";

type SubagentOutcome =
  | "running"
  | "interrupted"
  | "done"
  | "failed"
  | "skipped"
  | "notFound";

function getOutcome(params: {
  isPending: boolean;
  isActive: boolean;
  isError: boolean;
  result: ChatSubagentResult | null;
}): SubagentOutcome {
  if (params.isPending) {
    // A pending run whose message stopped streaming never finished.
    return params.isActive ? "running" : "interrupted";
  }
  if (params.isError || params.result?.kind === "failed") {
    return "failed";
  }
  if (params.result?.kind === "skipped") {
    return "skipped";
  }
  if (params.result?.kind === "notFound") {
    return "notFound";
  }
  return "done";
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
      return t("result.draft", { title: result.title ?? "none" });
    case "image":
      return t("result.image", { title: result.title ?? "none" });
    case "notFound":
      return t("result.notFound", { reason: result.reason ?? "none" });
    case "skipped":
      return t("result.skipped", { reason: result.reason ?? "none" });
    case "failed":
      return t("result.failed", { reason: result.reason ?? "none" });
    default: {
      const exhaustive: never = result;
      return exhaustive;
    }
  }
}

function getSubagentConfig(agentName: string) {
  if (!isChatSubagentName(agentName)) {
    return CHAT_SUBAGENT_FALLBACK;
  }
  return CHAT_SUBAGENTS[agentName] ?? CHAT_SUBAGENT_FALLBACK;
}

function SubagentProgress({
  isStreaming,
  toolCallId,
  stepCount,
}: {
  isStreaming: boolean;
  toolCallId: string;
  stepCount: number | undefined;
}) {
  const t = useTranslations("ai.subagent");
  const elapsedSeconds = useElapsedSeconds(isStreaming, toolCallId);
  let label: string | null = null;
  if (isStreaming) {
    label = formatElapsedSeconds(elapsedSeconds);
  } else if (stepCount !== undefined) {
    label = t("steps", { count: stepCount });
  }
  return (
    <span className="text-muted-foreground/60 shrink-0 text-xs tabular-nums">
      {label}
    </span>
  );
}

function SubagentChevron({ isOpen }: { isOpen: boolean }) {
  return (
    <HugeiconsIcon
      aria-hidden
      className={cn(
        "text-muted-foreground/60 size-3.5 shrink-0 transition-transform motion-reduce:transition-none",
        isOpen ? "rotate-180" : "rotate-0 opacity-0 group-hover:opacity-100"
      )}
      icon={ArrowDown01Icon}
    />
  );
}

function SubagentResultLine({ summary }: { summary: string }) {
  return (
    <div className="text-muted-foreground flex min-w-0 items-start gap-2 text-sm leading-5">
      <HugeiconsIcon
        aria-hidden
        className="mt-0.75 size-3.5 shrink-0"
        icon={ArrowMoveDownRightIcon}
        strokeWidth={1.8}
      />
      <span className="min-w-0 text-pretty">{summary}</span>
    </div>
  );
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
  const config = getSubagentConfig(agentName);
  const isError = state === "output-error" || Boolean(errorText);
  const isPending = state === "input-streaming" || state === "input-available";
  const isStreaming = isActive && isPending;
  const result = isPending ? null : getChatSubagentResult(agentName, output);
  const outcome = getOutcome({ isPending, isActive, isError, result });
  const activity = t(`activity.${config.labelKey}`, { state: outcome });
  const summary = isPending ? null : describeResult(result, errorText, t);
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
        <SubagentProgress
          isStreaming={isStreaming}
          stepCount={stepCount}
          toolCallId={toolCallId}
        />
        {hasBody ? <SubagentChevron isOpen={isOpen} /> : null}
      </CollapsibleTrigger>
      <CollapsibleContent className={ACTIVITY_CONTENT_CLASSNAME}>
        <div className="border-border/70 mt-2 ml-1.5 flex min-w-0 flex-col gap-2 border-l pl-3">
          {children}
          {summary ? <SubagentResultLine summary={summary} /> : null}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
