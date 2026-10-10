"use client";

import { Shimmer } from "@notra/ui/components/ai-elements/shimmer";
import { useTranslations } from "use-intl";

import { AgentFeedbackStatusIcon } from "@/components/agent-feedback/feedback-status-icon";
import { SITE_STATUS_ICONS } from "@/constants/sites";
import { cn } from "@/lib/utils";
import type { SiteStatusDotProps } from "@/types/components/sites";
import { isDeploymentInProgress } from "@/utils/site-deployments";

export function SiteStatusDot({
  status,
  duration,
  live = false,
  className,
}: SiteStatusDotProps) {
  const t = useTranslations("sites.status");
  let label = t(status === "uploading" ? "building" : status);
  if (live && status === "ready") {
    label = t("live");
  }
  const running = isDeploymentInProgress(status) && status !== "queued";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-sm whitespace-nowrap",
        className
      )}
    >
      <AgentFeedbackStatusIcon
        className={SITE_STATUS_ICONS[status].className}
        status={SITE_STATUS_ICONS[status].icon}
      />
      {running ? <Shimmer as="span">{label}</Shimmer> : <span>{label}</span>}
      {duration ? (
        <span className="text-muted-foreground tabular-nums">{duration}</span>
      ) : null}
    </span>
  );
}

export function SiteOfflineStatus() {
  const t = useTranslations("sites.detail");
  return (
    <span className="inline-flex items-center gap-1.5 text-sm whitespace-nowrap">
      <AgentFeedbackStatusIcon
        className="text-muted-foreground"
        status="archived"
      />
      <span>{t("offline")}</span>
    </span>
  );
}
