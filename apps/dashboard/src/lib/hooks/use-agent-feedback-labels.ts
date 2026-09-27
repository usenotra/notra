import type {
  AgentFeedbackKind,
  AgentFeedbackStatus,
} from "@notra/db/types/agent-feedback";
import { useTranslations } from "next-intl";

export function useAgentFeedbackStatusLabels(): Record<
  AgentFeedbackStatus,
  string
> {
  const tCommon = useTranslations("common.labels");
  const tShared = useTranslations("feedback.shared");
  return {
    new: tCommon("new"),
    triaged: tShared("triaged"),
    resolved: tShared("resolved"),
    archived: tCommon("archived"),
  };
}

export function useAgentFeedbackKindLabels(): Record<
  AgentFeedbackKind,
  string
> {
  const t = useTranslations("feedback.kind");
  const tCommon = useTranslations("common.labels");
  return {
    bug: t("bug"),
    feature: t("feature"),
    praise: t("praise"),
    question: tCommon("question"),
    other: tCommon("otherNeuter"),
  };
}
