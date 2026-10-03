"use client";

import { Shimmer } from "@notra/ui/components/ai-elements/shimmer";
import { useTranslations } from "next-intl";

import { SITE_STATUS_DOT_STYLES } from "@/constants/sites";
import { cn } from "@/lib/utils";
import type { SiteDeploymentStatus } from "@/types/sites";
import { isDeploymentInProgress } from "@/utils/site-deployments";

/**
 * Build status as a colored dot and label: building amber, ready green,
 * failed red, everything else grey. The color lives on the dot only; a
 * running build shimmers its label. Uploading takes a second and reads as
 * part of the build.
 */
export function SiteStatusDot({
  status,
  duration,
  live = false,
  className,
}: {
  status: SiteDeploymentStatus;
  /** A ready build that visitors see right now reads "Live". */
  live?: boolean;
  /** Shown muted after the label, e.g. "17s". */
  duration?: string | null;
  className?: string;
}) {
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
