"use client";

import { Shimmer } from "@notra/ui/components/ai-elements/shimmer";
import { useTranslations } from "use-intl";

import { SITE_STATUS_DOT_STYLES } from "@/constants/sites";
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
        "inline-flex items-center gap-2 text-sm whitespace-nowrap",
        className
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "size-2 shrink-0 rounded-full",
          SITE_STATUS_DOT_STYLES[status]
        )}
      />
      {running ? (
        <Shimmer as="span" className="font-medium">
          {label}
        </Shimmer>
      ) : (
        <span className="font-medium">{label}</span>
      )}
      {duration ? (
        <span className="text-muted-foreground tabular-nums">{duration}</span>
      ) : null}
    </span>
  );
}
