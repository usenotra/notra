"use client";

import { Badge } from "@notra/ui/components/ui/badge";
import { useTranslations } from "use-intl";

import { AGENT_READINESS_CHANGE_BADGE_VARIANT } from "@/constants/agent-readiness";
import type { AgentReadinessChangeBadgeProps } from "@/types/agent-readiness";

export function AgentReadinessChangeBadge({
  change,
}: AgentReadinessChangeBadgeProps) {
  const t = useTranslations("geo.agentReadiness.changes");

  if (!change) {
    return null;
  }
  return (
    <Badge size="sm" variant={AGENT_READINESS_CHANGE_BADGE_VARIANT[change]}>
      {t(change)}
    </Badge>
  );
}
