import { HugeiconsIcon } from "@hugeicons/react";
import { cn } from "@notra/ui/lib/utils";
import { useTranslations } from "use-intl";

import { AgentFeedbackStatusIcon } from "@/components/agent-feedback/feedback-status-icon";
import {
  AGENT_FEEDBACK_KIND_ICONS,
  AGENT_FEEDBACK_KIND_PILL_CLASS,
  AGENT_FEEDBACK_LABEL_PILL_CLASS,
  AGENT_FEEDBACK_SENTIMENT_ICONS,
  AGENT_FEEDBACK_SENTIMENT_PILL_CLASS,
} from "@/constants/agent-feedback";
import {
  useAgentFeedbackKindLabels,
  useAgentFeedbackStatusLabels,
} from "@/lib/hooks/use-agent-feedback-labels";
import type {
  AgentFeedbackKindBadgeProps,
  AgentFeedbackSentimentLabelProps,
  AgentFeedbackStatusBadgeProps,
} from "@/types/agent-feedback";

export function AgentFeedbackStatusBadge({
  status,
  showLabel = true,
}: AgentFeedbackStatusBadgeProps) {
  const statusLabels = useAgentFeedbackStatusLabels();
  return (
    <span className="inline-flex items-center gap-1.5">
      <AgentFeedbackStatusIcon status={status} />
      {showLabel ? (
        <span className="text-sm">{statusLabels[status]}</span>
      ) : (
        <span className="sr-only">{statusLabels[status]}</span>
      )}
    </span>
  );
}

export function AgentFeedbackKindBadge({ kind }: AgentFeedbackKindBadgeProps) {
  const kindLabels = useAgentFeedbackKindLabels();
  return (
    <span
      className={cn(
        AGENT_FEEDBACK_LABEL_PILL_CLASS,
        AGENT_FEEDBACK_KIND_PILL_CLASS[kind]
      )}
    >
      <HugeiconsIcon
        aria-hidden
        className="size-3.5 shrink-0"
        icon={AGENT_FEEDBACK_KIND_ICONS[kind]}
        strokeWidth={2}
      />
      {kindLabels[kind]}
    </span>
  );
}

export function AgentFeedbackSentimentLabel({
  sentiment,
}: AgentFeedbackSentimentLabelProps) {
  const t = useTranslations("common.labels");
  if (!sentiment) {
    return <span className="text-muted-foreground text-xs">–</span>;
  }
  return (
    <span
      className={cn(
        AGENT_FEEDBACK_LABEL_PILL_CLASS,
        AGENT_FEEDBACK_SENTIMENT_PILL_CLASS[sentiment]
      )}
    >
      <HugeiconsIcon
        aria-hidden
        className="size-3.5 shrink-0"
        icon={AGENT_FEEDBACK_SENTIMENT_ICONS[sentiment]}
        strokeWidth={2}
      />
      {t(sentiment)}
    </span>
  );
}
